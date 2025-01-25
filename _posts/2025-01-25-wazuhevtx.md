---
title: "Enhancing Wazuh Rule Testing with `wazuhevtx`: A Solution for Windows Event Logs"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Windows Event Log
  - Log test
  - Attack simulation
---

Wazuh's powerful log analysis and rule engine enables organizations to monitor and respond to a wide range of security events. For Wazuh users, fine-tuning and testing custom rules and decoders is a crucial part of the process. This is where the `wazuh-logtest` tool shines—providing a sandboxed environment to validate and refine rules against sample logs.

However, when it comes to Windows event logs, the `wazuh-logtest` presents a unique challenge. In this article, I’ll explore the problem and introduce `wazuhevtx`, a tool designed to bridge the gap and bring seamless rule testing for Windows event logs to the Wazuh ecosystem.

<!--more-->

### Rule Testing with `wazuh-logtest`

The `wazuh-logtest` tool is an interactive utility that enables users to test rules and decoders in isolation. It allows you to paste sample logs, view their processing lifecycle, and observe which rules match. This three-phase process—pre-decoding, decoding, and filtering—helps users debug decoders, refine rules, and validate expected behaviors. You can find the [official documentation of the tool](https://documentation.wazuh.com/current/user-manual/reference/tools/wazuh-logtest.html) for parameters, [getting started guide](https://documentation.wazuh.com/current/user-manual/ruleset/testing.html), and [architecture](https://documentation.wazuh.com/current/development/wazuh-logtest.html) on Wazuh resources.

#### How `wazuh-logtest` Works

First of all, you need to understand that it is not possible to run `wazuh-logtest` as an independent tool on your workstation. It is a component of the Wazuh manager, namely part of `analysisd`. Therefore, the tool runs on the Wazuh manager nodes. It creates isolated sessions so that these are not mixed with actual logs forwarded to analysis.

While it is tempting to modify it to work locally -or remotely, depending on where you look at it, the tool uses AF_UNIX sockets instead of [RESTful API](https://documentation.wazuh.com/current/user-manual/api/reference.html#tag/Logtest). If you want to work with it remotely, you may want to write a client and allow HTTPS traffic to your server [over TCP/55000](https://documentation.wazuh.com/current/getting-started/architecture.html). You can use curl, Postman, [Bruno](https://docs.usebruno.com/introduction/what-is-bruno) or any scripting language of your preference as well.

I will focus on the CLI tool instead. Let's go step by step:

1. **Launch the Tool:** Run `wazuh-logtest` interactively:

On the Wazuh manager node, run this command to start.

```bash
/var/ossec/bin/wazuh-logtest
```

2. **Paste a Log:** Provide a sample log in the required format. For example:

```plaintext
Oct 15 21:07:00 linux-agent sshd[29205]: Invalid user blimey from 18.18.18.18 port 48928
```

3. **Analyze the Output:** The tool processes the log in three phases

  Phase 1: Pre-Decoding—Extracts metadata such as hostname, program_name, and timestamp.
<img src="/assets/logtest-phase1.png" width="800" alt="Pre-Decoding—Extracts metadata such as hostname, program_name, and timestamp">

  Phase 2: Decoding—Matches decoders and extracts specific fields (e.g., srcip, srcuser).
<img src="/assets/logtest-phase2.png" width="800" alt="Decoding—Matches decoders and extracts specific fields (e.g., srcip, srcuser)">

  Phase 3: Filtering—Applies Wazuh rules, displaying matched rule IDs, descriptions, and metadata.
<img src="/assets/logtest-phase3.png" width="800" alt="Filtering—Applies Wazuh rules, displaying matched rule IDs, descriptions, and metadata.">

This process makes `wazuh-logtest` invaluable for testing and debugging custom rules—except when dealing with Windows event logs.

#### The Problem with Windows Event Logs

Unlike typical logs stored as plaintext, Windows event logs are structured binary files that are beyond Wazuh decoders. Instead, the Wazuh agent uses the functions provided by [wevtapi.dll](https://windows10dll.nirsoft.net/wevtapi_dll.html) to process these logs locally before sending them to the manager[^1]. The logs are converted to JSON formatted logs with the metadata of `log_format` as `windows_eventchannel` so that they are not accidentally parsed as a JSON log.

This causes several issues. First, Windows event logs cannot be tested directly in `wazuh-logtest` because users are unable to paste raw event data (well, they need to extract text out of event logs first but even then it's not possible) or verify rules against Windows logs in the same way they do with syslog or audit logs.

This limitation leaves a critical gap for Wazuh users who need to validate rules for Windows event channels like Sysmon or Security-Auditing., especially if you want to test your ability to detect known attacks given that you have event logs extracted.

### Introducing `wazuhevtx`

To address this challenge, I developed `wazuhevtx`, a Python tool that converts Windows event logs (EVTX) into JSON formatted logs that mimic the output of the Wazuh agent. This allows users to test Windows event logs interactively with `wazuh-logtest`.

It is neither the first attempt nor the only publicly available one. The most well-known attempt is a [PowerShell script](https://github.com/dariommr/scripts/blob/master/tools/windows-events/Event-Converter.ps1) written by [Darío Menten](https://github.com/dariommr). However, that's not perfect as it does not 100% produce the logs the Wazuh agent would. Therefore, the results were not reliable for testing purposes.

I wrote `wazuhevtx` in Python because I wanted to have a toolkit that I could integrate within the components. However, I concluded that it is not viable to write a cross-platform script due to dependency on Windows APIs that generate the human-readable Message field, which is not included in the logs but rendered based on the event log provider resources. It wouldn't be feasible to rewrite all Event Log providers just to make this tool work on Linux and Mac. But if I had known that I would toss against this wall, I'd just fork the script of Darío and improve it.

On the other hand, I made `wazuhevtx` work as both a CLI tool and a library, so you can integrate it into your pipeline the way you prefer.

#### What Does `wazuhevtx` Do?

`wazuhevtx` reads binary EVTX files from Windows systems and converts events into structured JSON logs, formatted as the Wazuh agent would send them to enable seamless rule testing in `wazuh-logtest`. It's like an emulator for the Wazuh agent that works only for `evtx` files.

#### How to Use `wazuhevtx`

Here I will use `wazuh-logtest` the way I did above, with some extra steps.

##### Step 1: Install the Tool

You can use `pip` or clone the repository if you want to use it both as a library and a CLI tool. Install the module using `pip install https://github.com/zbalkan/wazuhevtx/archive/refs/heads/main.zip`, after you create a virtual environment of your preference.

To use it only as a CLI tool, I recommend using `pipx` instead. The command is simple: `pipx install https://github.com/zbalkan/wazuhevtx/archive/refs/heads/main.zip`

##### Step 2: Prepare the Wazuh server for testing

In order to be able to test with the `wazuh-logtest` utility, you need a workaround as the tool generates JSON logs, not `windows_eventchannel` format[^2].

* Navigate to `/var/ossec/ruleset/rules/0575-win-base_rules.xml` file.
* Update the rule 60000 this way:

```xml
<rule id="60000" level="2">
    <!-- category>ossec</category -->
    <!-- decoded_as>windows_eventchannel</decoded_as -->
    <decoded_as>json</decoded_as>
    <field name="win.system.providerName">\.+</field>
    <options>no_full_log</options>
    <description>Group of windows rules.</description>
</rule>
```

As I said, you would not want to do it in your production environment. Either pop up an [all-in-one (AIO) virtual machine using the OVA](https://documentation.wazuh.com/current/deployment-options/virtual-machine/virtual-machine.html) on your workstation or have a dedicated test installation in your environment. There's an alternative way, but I'll come to that later.

##### Step 3: Convert EVTX Logs to JSON

Run the `wazuhevtx` tool with your EVTX file as input:

```bash
python wazuhevtx.py sysmon-1.evtx -o sysmon1.json
```

##### Step 4: Test Logs in `wazuh-logtest`

1. Launch `wazuh-logtest`:

```bash
/var/ossec/bin/wazuh-logtest
```

2. Copy a single JSON log from the output file (sample.json) and paste it into the `wazuh-logtest` terminal:

```json
{"win": {"system": {"providerName": "Microsoft-Windows-Sysmon", "providerGuid": "{5770385f-c22a-43e0-bf4c-06f5698ffbd9}", "eventID": "1", "version": "5", "level": "4", "task": "1", "opcode": "0", "keywords": "0x8000000000000000", "systemTime": "2025-01-20 19:17:01.622587", "eventRecordID": "8513729", "processID": "5984", "threadID": "5172", "channel": "Microsoft-Windows-Sysmon/Operational", "computer": "LABPC", "severityValue": "INFORMATION", "correlation": {"@ActivityID": "", "@RelatedActivityID": ""}, "message": "RuleName: technique_id=T1083,technique_name=File and Directory Discovery\r\nUtcTime: 2025-01-20 19:17:01.619\r\nProcessGuid: {480c9770-a12d-678e-2213-000000007002}\r\nProcessId: 16936\r\nImage: C:\\Program Files\\Mozilla Firefox\\firefox.exe\r\nFileVersion: 134.0.1\r\nDescription: Firefox\r\nProduct: Firefox\r\nCompany: Mozilla Corporation\r\nOriginalFileName: firefox.exe\r\nCommandLine: \"C:\\Program Files\\Mozilla Firefox\\firefox.exe\" -contentproc -parentBuildID 20250113121357 -prefsHandle 1940 -prefsLen 24793 -prefMapHandle 1944 -prefMapSize 265795 -ipcHandle 2008 -initialChannelId {eee169d3-e43f-4043-b52d-1ecfbf1fbb4e} -parentPid 11208 -crashReporter \"\\\\.\\pipe\\gecko-crash-server-pipe.11208\" -win32kLockedDown -appDir \"C:\\Program Files\\Mozilla Firefox\\browser\" - 1 socket\r\nCurrentDirectory: C:\\ProgramData\\Mozilla-1de4eec8-1241-4177-a864-e594e8d1fb38\\updates\\308046B0AF4A39CB\\\r\nUser: LABPC\\Zafer\r\nLogonGuid: {480c9770-7822-678e-0982-040000000000}\r\nLogonId: 0x0000000000048209\r\nTerminalSessionId: 1\r\nIntegrityLevel: Low\r\nHashes: SHA1=75D45A363C5AFD2842054F1AC8C623F31F7B634D,MD5=7965045DCEFD7B6E7AC6E62819F0AA55,SHA256=D8F655E89B08AE12EDDEA0A9E43780BC21B8785BAA4F5A832BC2B53A8C634365,IMPHASH=BB4CE52E8306F88C0B1DA570553704E4\r\nParentProcessGuid: {480c9770-a12c-678e-1e13-000000007002}\r\nParentProcessId: 11208\r\nParentImage: C:\\Program Files\\Mozilla Firefox\\firefox.exe\r\nParentCommandLine: \"C:\\Program Files\\Mozilla Firefox\\firefox.exe\" --MOZ_LOG sync,prependheader,timestamp,append,maxsize:1,Dump:5 --MOZ_LOG_FILE C:\\ProgramData\\Mozilla-1de4eec8-1241-4177-a864-e594e8d1fb38\\updates\\308046B0AF4A39CB\\backgroundupdate.moz_log --backgroundtask backgroundupdate\r\nParentUser: LABPC\\Zafer"}, "eventdata": {"ruleName": "technique_id=T1083,technique_name=File and Directory Discovery", "utcTime": "2025-01-20 19:17:01.619", "processGuid": "{480c9770-a12d-678e-2213-000000007002}", "processId": "16936", "image": "C:\\Program Files\\Mozilla Firefox\\firefox.exe", "fileVersion": "134.0.1", "description": "Firefox", "product": "Firefox", "company": "Mozilla Corporation", "originalFileName": "firefox.exe", "commandLine": "\"C:\\Program Files\\Mozilla Firefox\\firefox.exe\" -contentproc -parentBuildID 20250113121357 -prefsHandle 1940 -prefsLen 24793 -prefMapHandle 1944 -prefMapSize 265795 -ipcHandle 2008 -initialChannelId {eee169d3-e43f-4043-b52d-1ecfbf1fbb4e} -parentPid 11208 -crashReporter \"\\\\.\\pipe\\gecko-crash-server-pipe.11208\" -win32kLockedDown -appDir \"C:\\Program Files\\Mozilla Firefox\\browser\" - 1 socket", "currentDirectory": "C:\\ProgramData\\Mozilla-1de4eec8-1241-4177-a864-e594e8d1fb38\\updates\\308046B0AF4A39CB\\", "user": "LABPC\\Zafer", "logonGuid": "{480c9770-7822-678e-0982-040000000000}", "logonId": "0x0000000000048209", "terminalSessionId": "1", "integrityLevel": "Low", "hashes": "SHA1=75D45A363C5AFD2842054F1AC8C623F31F7B634D,MD5=7965045DCEFD7B6E7AC6E62819F0AA55,SHA256=D8F655E89B08AE12EDDEA0A9E43780BC21B8785BAA4F5A832BC2B53A8C634365,IMPHASH=BB4CE52E8306F88C0B1DA570553704E4", "parentProcessGuid": "{480c9770-a12c-678e-1e13-000000007002}", "parentProcessId": "11208", "parentImage": "C:\\Program Files\\Mozilla Firefox\\firefox.exe", "parentCommandLine": "\"C:\\Program Files\\Mozilla Firefox\\firefox.exe\" --MOZ_LOG sync,prependheader,timestamp,append,maxsize:1,Dump:5 --MOZ_LOG_FILE C:\\ProgramData\\Mozilla-1de4eec8-1241-4177-a864-e594e8d1fb38\\updates\\308046B0AF4A39CB\\backgroundupdate.moz_log --backgroundtask backgroundupdate", "parentUser": "LABPC\\Zafer"}}}

```

3. Observe the output:

Check matched rules, extracted fields, and compliance mappings: you can see, without needing a custom decoder, that I extracted all JSON fields, and then managed to get the Sysmon event as a level-0 alert.

```plaintext
**Phase 1: Completed pre-decoding.

**Phase 2: Completed decoding.
        name: 'json'
        win.eventdata.commandLine: '"C:\Program Files\Mozilla Firefox\firefox.exe" -contentproc -parentBuildID 20250113121357 -prefsHandle 1940 -prefsLen 24793 -prefMapHandle 1944 -prefMapSize 265795 -ipcHandle 2008 -initialChannelId {eee169d3-e43f-4043-b52d-1ecfbf1fbb4e} -parentPid 11208 -crashReporter "\\.\pipe\gecko-crash-server-pipe.11208" -win32kLockedDown -appDir "C:\Program Files\Mozilla Firefox\browser" - 1 socket'
        win.eventdata.company: 'Mozilla Corporation'
        win.eventdata.currentDirectory: 'C:\ProgramData\Mozilla-1de4eec8-1241-4177-a864-e594e8d1fb38\updates\308046B0AF4A39CB\'
        win.eventdata.description: 'Firefox'
        win.eventdata.fileVersion: '134.0.1'
        win.eventdata.hashes: 'SHA1=75D45A363C5AFD2842054F1AC8C623F31F7B634D,MD5=7965045DCEFD7B6E7AC6E62819F0AA55,SHA256=D8F655E89B08AE12EDDEA0A9E43780BC21B8785BAA4F5A832BC2B53A8C634365,IMPHASH=BB4CE52E8306F88C0B1DA570553704E4'
        win.eventdata.image: 'C:\Program Files\Mozilla Firefox\firefox.exe'
        win.eventdata.integrityLevel: 'Low'
        win.eventdata.logonGuid: '{480c9770-7822-678e-0982-040000000000}'
        win.eventdata.logonId: '0x0000000000048209'
        win.eventdata.originalFileName: 'firefox.exe'
        win.eventdata.parentCommandLine: '"C:\Program Files\Mozilla Firefox\firefox.exe" --MOZ_LOG sync,prependheader,timestamp,append,maxsize:1,Dump:5 --MOZ_LOG_FILE C:\ProgramData\Mozilla-1de4eec8-1241-4177-a864-e594e8d1fb38\updates\308046B0AF4A39CB\backgroundupdate.moz_log --backgroundtask backgroundupdate'
        win.eventdata.parentImage: 'C:\Program Files\Mozilla Firefox\firefox.exe'
        win.eventdata.parentProcessGuid: '{480c9770-a12c-678e-1e13-000000007002}'
        win.eventdata.parentProcessId: '11208'
        win.eventdata.parentUser: 'LABPC\Zafer'
        win.eventdata.processGuid: '{480c9770-a12d-678e-2213-000000007002}'
        win.eventdata.processId: '16936'
        win.eventdata.product: 'Firefox'
        win.eventdata.ruleName: 'technique_id=T1083,technique_name=File and Directory Discovery'
        win.eventdata.terminalSessionId: '1'
        win.eventdata.user: 'LABPC\Zafer'
        win.eventdata.utcTime: '2025-01-20 19:17:01.619'
        win.system.channel: 'Microsoft-Windows-Sysmon/Operational'
        win.system.computer: 'LABPC'
        win.system.eventID: '1'
        win.system.eventRecordID: '8513729'
        win.system.keywords: '0x8000000000000000'
        win.system.level: '4'
        win.system.message: 'RuleName: technique_id=T1083,technique_name=File and Directory Discovery
UtcTime: 2025-01-20 19:17:01.619
ProcessGuid: {480c9770-a12d-678e-2213-000000007002}
ProcessId: 16936
Image: C:\Program Files\Mozilla Firefox\firefox.exe
FileVersion: 134.0.1
Description: Firefox
Product: Firefox
Company: Mozilla Corporation
OriginalFileName: firefox.exe
CommandLine: "C:\Program Files\Mozilla Firefox\firefox.exe" -contentproc -parentBuildID 20250113121357 -prefsHandle 1940 -prefsLen 24793 -prefMapHandle 1944 -prefMapSize 265795 -ipcHandle 2008 -initialChannelId {eee169d3-e43f-4043-b52d-1ecfbf1fbb4e} -parentPid 11208 -crashReporter "\\.\pipe\gecko-crash-server-pipe.11208" -win32kLockedDown -appDir "C:\Program Files\Mozilla Firefox\browser" - 1 socket
CurrentDirectory: C:\ProgramData\Mozilla-1de4eec8-1241-4177-a864-e594e8d1fb38\updates\308046B0AF4A39CB\
User: LABPC\Zafer
LogonGuid: {480c9770-7822-678e-0982-040000000000}
LogonId: 0x0000000000048209
TerminalSessionId: 1
IntegrityLevel: Low
Hashes: SHA1=75D45A363C5AFD2842054F1AC8C623F31F7B634D,MD5=7965045DCEFD7B6E7AC6E62819F0AA55,SHA256=D8F655E89B08AE12EDDEA0A9E43780BC21B8785BAA4F5A832BC2B53A8C634365,IMPHASH=BB4CE52E8306F88C0B1DA570553704E4
ParentProcessGuid: {480c9770-a12c-678e-1e13-000000007002}
ParentProcessId: 11208
ParentImage: C:\Program Files\Mozilla Firefox\firefox.exe
ParentCommandLine: "C:\Program Files\Mozilla Firefox\firefox.exe" --MOZ_LOG sync,prependheader,timestamp,append,maxsize:1,Dump:5 --MOZ_LOG_FILE C:\ProgramData\Mozilla-1de4eec8-1241-4177-a864-e594e8d1fb38\updates\308046B0AF4A39CB\backgroundupdate.moz_log --backgroundtask backgroundupdate
ParentUser: LABPC\Zafer'
        win.system.opcode: '0'
        win.system.processID: '5984'
        win.system.providerGuid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}'
        win.system.providerName: 'Microsoft-Windows-Sysmon'
        win.system.severityValue: 'INFORMATION'
        win.system.systemTime: '2025-01-20 19:17:01.622587'
        win.system.task: '1'
        win.system.threadID: '5172'
        win.system.version: '5'

**Phase 3: Completed filtering (rules).
        id: '61603'
        level: '0'
        description: 'Sysmon - Event 1: Process creation Firefox'
        groups: '['windows', 'sysmon', 'sysmon_event1']'
        firedtimes: '1'
        mail: 'False'
```

### Let's (re)play

As mentioned in the introduction, I built this to complement the log testing capability of Wazuh, and Event Logs were an edge case—a very big one. You can now replay known attacks and see the detection capabilities of your ruleset.

Let's give it a shot with the amazing [EVTX-ATTACK-SAMPLES](https://github.com/sbousseaden/EVTX-ATTACK-SAMPLES) repository by [Samir Bousseaden](https://x.com/sbousseaden). I will use the same steps above but with a more fitting input for the purpose.

<img src="/assets/attack-samples.png" width="800" alt="Screenshot of the Github repository">

In the same repo, I downloaded the `UACME_59_Sysmon.evtx`, a small sample of events indicating the logs generated when the [Windows User Account Control (UAC)](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/) bypass tool [UACME](https://github.com/hfiref0x/UACME) for privilege escalation. Check [MITRE resources](https://attack.mitre.org/software/S0116/) for more information about the tool.

<img src="/assets/uacme.png" width="800" alt="Screenshot of the file from Github repository">

The methodology I am going to use below includes a comparison of the event log displayed on Event Viewer against Wazuh logtest results. I am using the default ruleset so that it is possible to see what Wazuh base ruleset is capable of, and if there are any opportunities to write custom detections.

<img src="/assets/uacme-sysmon.png" width="800" alt="Screenshot of the event logs">

You can see that there are 7 events in the sample, therefore I will include 7 subsections here.

#### Log 1 (20:43:58.350 UTC): Initial Execution of UACMe (Akagi_64.exe)

<img src="/assets/uacme-log1.PNG" width="800" alt="Log 1 (20:43:58.350 UTC): Initial Execution of UACMe (Akagi_64.exe)">

* The attacker executed Akagi_64.exe from the UACMe toolset, a known User Account Control (UAC) bypass utility. The process was located in the user's Downloads folder.
* Akagi_64.exe accessed the cmd.exe process in C:\Windows\System32 with access rights (0x1410) that allowed process manipulation.
* If you check [the documentation on access rights](https://learn.microsoft.com/en-us/windows/win32/procthread/process-security-and-access-rights?redirectedfrom=MSDN) from Microsoft, you will see that you need to do some simple calculations to understand the flags. The call is possibly something like:

```c
HANDLE hProcess = OpenProcess(
    PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
    FALSE,
    processId);
```

* The call trace shows interactions with multiple system libraries (ntdll.dll, KERNELBASE.dll, OPENGL32.dll), indicating that the tool exploited standard Windows APIs to bypass UAC and elevate privileges.

```plaintext
**Phase 1: Completed pre-decoding.

**Phase 2: Completed decoding.
        name: 'json'
        win.eventdata.callTrace: 'C:\windows\SYSTEM32\ntdll.dll+9c534|C:\windows\System32\KERNELBASE.dll+305fe|C:\windows\SYSTEM32\OPENGL32.dll+e56db|C:\windows\SYSTEM32\OPENGL32.dll+e61b9|C:\windows\SYSTEM32\OPENGL32.dll+2989b|C:\windows\SYSTEM32\OPENGL32.dll+2aa69|C:\windows\SYSTEM32\OPENGL32.dll+44f79|C:\windows\SYSTEM32\OPENGL32.dll+44335|C:\windows\System32\gdi32full.dll+75989|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+1d90b|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+1dd60|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+1e070|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+428d2|C:\windows\SYSTEM32\VCRUNTIME140D.dll+1be5b|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+3dcd6|C:\windows\SYSTEM32\ntdll.dll+a11cf|C:\windows\SYSTEM32\ntdll.dll+6a209|C:\windows\SYSTEM32\ntdll.dll+9fe3e|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+1d29d|C:\windows\System32\KERNEL32.DLL+17bd4|C:\windows\SYSTEM32\ntdll.dll+6ce51'        win.eventdata.grantedAccess: '0x1410'
        win.eventdata.sourceImage: 'C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe'
        win.eventdata.sourceProcessGUID: '{00247c92-858e-5f7b-0000-00106b29202b}'
        win.eventdata.sourceProcessId: '27356'
        win.eventdata.sourceThreadId: '4732'
        win.eventdata.targetImage: 'C:\Windows\System32\cmd.exe'
        win.eventdata.targetProcessGUID: '{00247c92-82a5-5f7b-0000-0010c89f0a2b}'
        win.eventdata.targetProcessId: '19072'
        win.eventdata.utcTime: '2020-10-05 20:43:58.350'
        win.system.channel: 'Microsoft-Windows-Sysmon/Operational'
        win.system.computer: 'LAPTOP-JU4M3I0E'
        win.system.eventID: '10'
        win.system.eventRecordID: '2164886'
        win.system.keywords: '0x8000000000000000'
        win.system.level: '4'
        win.system.message: 'Process accessed:
RuleName:
UtcTime: 2020-10-05 20:43:58.350
SourceProcessGUID: {00247c92-858e-5f7b-0000-00106b29202b}
SourceProcessId: 27356
SourceThreadId: 4732
SourceImage: C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe
TargetProcessGUID: {00247c92-82a5-5f7b-0000-0010c89f0a2b}
TargetProcessId: 19072
TargetImage: C:\Windows\System32\cmd.exe
GrantedAccess: 0x1410
CallTrace: C:\windows\SYSTEM32\ntdll.dll+9c534|C:\windows\System32\KERNELBASE.dll+305fe|C:\windows\SYSTEM32\OPENGL32.dll+e56db|C:\windows\SYSTEM32\OPENGL32.dll+e61b9|C:\windows\SYSTEM32\OPENGL32.dll+2989b|C:\windows\SYSTEM32\OPENGL32.dll+2aa69|C:\windows\SYSTEM32\OPENGL32.dll+44f79|C:\windows\SYSTEM32\OPENGL32.dll+44335|C:\windows\System32\gdi32full.dll+75989|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+1d90b|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+1dd60|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+1e070|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+428d2|C:\windows\SYSTEM32\VCRUNTIME140D.dll+1be5b|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+3dcd6|C:\windows\SYSTEM32\ntdll.dll+a11cf|C:\windows\SYSTEM32\ntdll.dll+6a209|C:\windows\SYSTEM32\ntdll.dll+9fe3e|C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe+1d29d|C:\windows\System32\KERNEL32.DLL+17bd4|C:\windows\SYSTEM32\ntdll.dll+6ce51
SourceUser: %12
TargetUser: %13'
        win.system.opcode: '0'
        win.system.processID: '5424'
        win.system.providerGuid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}'
        win.system.providerName: 'Microsoft-Windows-Sysmon'
        win.system.severityValue: 'INFORMATION'
        win.system.systemTime: '2020-10-05T20:43:58.3517448Z'
        win.system.task: '10'
        win.system.threadID: '6708'
        win.system.version: '3'

**Phase 3: Completed filtering (rules).
        id: '61612'
        level: '0'
        description: 'Sysmon - Event 10: C:\Windows\System32\cmd.exe process accessed by C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe'
        groups: '['windows', 'sysmon', 'sysmon_event_10']'
        firedtimes: '1'
        mail: 'False'
```

Wazuh finds initiating `cmd.exe` not so interesting. You will not even see this event in the dashboards.

#### Log 2 (20:43:58.389 UTC): svchost.exe Accesses explorer.exe

<img src="/assets/uacme-log3.PNG" width="800" alt="Log 2 (20:43:58.389 UTC): svchost.exe Accesses explorer.exe">

* After launching the bypass tool, the system process svchost.exe accessed explorer.exe (Windows shell) with access rights (0x1014C0).
* This interaction likely aimed to manipulate the user interface environment or elevate privileges further within the current session.

```plaintext
**Phase 1: Completed pre-decoding.

**Phase 2: Completed decoding.
        name: 'json'
        win.eventdata.callTrace: 'C:\windows\SYSTEM32\ntdll.dll+9c534|c:\windows\system32\appinfo.dll+36f8|C:\windows\System32\RPCRT4.dll+76a53|C:\windows\System32\RPCRT4.dll+1ecb|C:\windows\System32\RPCRT4.dll+54998|C:\windows\System32\RPCRT4.dll+2c951|C:\windows\System32\RPCRT4.dll+2c4a0|C:\windows\System32\RPCRT4.dll+1a6bf|C:\windows\System32\RPCRT4.dll+19d1a|C:\windows\System32\RPCRT4.dll+19301|C:\windows\System32\RPCRT4.dll+18d6e|C:\windows\System32\RPCRT4.dll+169a5|C:\windows\SYSTEM32\ntdll.dll+333ed|C:\windows\SYSTEM32\ntdll.dll+34142|C:\windows\System32\KERNEL32.DLL+17bd4|C:\windows\SYSTEM32\ntdll.dll+6ce51'
        win.eventdata.grantedAccess: '0x1014c0'
        win.eventdata.sourceImage: 'C:\windows\system32\svchost.exe'
        win.eventdata.sourceProcessGUID: '{00247c92-5b27-5f74-0000-001045f11200}'
        win.eventdata.sourceProcessId: '11640'
        win.eventdata.sourceThreadId: '25568'
        win.eventdata.targetImage: 'C:\windows\explorer.exe'
        win.eventdata.targetProcessGUID: '{00247c92-858e-5f7b-0000-00106b29202b}'
        win.eventdata.targetProcessId: '27356'
        win.eventdata.utcTime: '2020-10-05 20:43:58.389'
        win.system.channel: 'Microsoft-Windows-Sysmon/Operational'
        win.system.computer: 'LAPTOP-JU4M3I0E'
        win.system.eventID: '10'
        win.system.eventRecordID: '2164887'
        win.system.keywords: '0x8000000000000000'
        win.system.level: '4'
        win.system.message: 'Process accessed:
RuleName:
UtcTime: 2020-10-05 20:43:58.389
SourceProcessGUID: {00247c92-5b27-5f74-0000-001045f11200}
SourceProcessId: 11640
SourceThreadId: 25568
SourceImage: C:\windows\system32\svchost.exe
TargetProcessGUID: {00247c92-858e-5f7b-0000-00106b29202b}
TargetProcessId: 27356
TargetImage: C:\windows\explorer.exe
GrantedAccess: 0x1014C0
CallTrace: C:\windows\SYSTEM32\ntdll.dll+9c534|c:\windows\system32\appinfo.dll+36f8|C:\windows\System32\RPCRT4.dll+76a53|C:\windows\System32\RPCRT4.dll+1ecb|C:\windows\System32\RPCRT4.dll+54998|C:\windows\System32\RPCRT4.dll+2c951|C:\windows\System32\RPCRT4.dll+2c4a0|C:\windows\System32\RPCRT4.dll+1a6bf|C:\windows\System32\RPCRT4.dll+19d1a|C:\windows\System32\RPCRT4.dll+19301|C:\windows\System32\RPCRT4.dll+18d6e|C:\windows\System32\RPCRT4.dll+169a5|C:\windows\SYSTEM32\ntdll.dll+333ed|C:\windows\SYSTEM32\ntdll.dll+34142|C:\windows\System32\KERNEL32.DLL+17bd4|C:\windows\SYSTEM32\ntdll.dll+6ce51
SourceUser: %12
TargetUser: %13'
        win.system.opcode: '0'
        win.system.processID: '5424'
        win.system.providerGuid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}'
        win.system.providerName: 'Microsoft-Windows-Sysmon'
        win.system.severityValue: 'INFORMATION'
        win.system.systemTime: '2020-10-05T20:43:58.3901903Z'
        win.system.task: '10'
        win.system.threadID: '6708'
        win.system.version: '3'

**Phase 3: Completed filtering (rules).
        id: '92910'
        level: '12'
        description: 'Explorer process was accessed by C:\windows\system32\svchost.exe, possible process injection'
        groups: '['sysmon', 'sysmon_eid10_detections', 'windows']'
        firedtimes: '1'
        mail: 'True'
        mitre.id: '['T1055']'
        mitre.tactic: '['Defense Evasion', 'Privilege Escalation']'
        mitre.technique: '['Process Injection']'
**Alert to be generated.
```

This time, Wazuh triggers an alert that it can be a process injection. Level 12 means *High importance event*, which is defined as *"These include error or warning messages from the system, kernel, etc. These may indicate an attack against a specific application"*, according to the [Rule Classification](https://documentation.wazuh.com/current/user-manual/ruleset/rules/rules-classification.html) guide[^3].

#### Log 3 (20:43:58.393 UTC): Repeated Access of explorer.exe by svchost.exe

<img src="/assets/uacme-log3.PNG" width="800" alt="Log 3 (20:43:58.393 UTC): Repeated Access of explorer.exe by svchost.exe">

* svchost.exe once again accessed explorer.exe, repeating the interaction from the previous event. This redundancy could indicate efforts to maintain control over the shell environment or validate escalated privileges.
* The granted access rights were the same (0x1014C0), confirming an ongoing manipulation attempt.
* I am not sure why this event occurred twice, need to check the source code.

```plaintext
**Phase 1: Completed pre-decoding.

**Phase 2: Completed decoding.
        name: 'json'
        win.eventdata.callTrace: 'C:\windows\SYSTEM32\ntdll.dll+9c534|c:\windows\system32\appinfo.dll+36f8|C:\windows\System32\RPCRT4.dll+76a53|C:\windows\System32\RPCRT4.dll+1ecb|C:\windows\System32\RPCRT4.dll+54998|C:\windows\System32\RPCRT4.dll+2c951|C:\windows\System32\RPCRT4.dll+2c4a0|C:\windows\System32\RPCRT4.dll+1a6bf|C:\windows\System32\RPCRT4.dll+19d1a|C:\windows\System32\RPCRT4.dll+19301|C:\windows\System32\RPCRT4.dll+18d6e|C:\windows\System32\RPCRT4.dll+169a5|C:\windows\SYSTEM32\ntdll.dll+333ed|C:\windows\SYSTEM32\ntdll.dll+34142|C:\windows\System32\KERNEL32.DLL+17bd4|C:\windows\SYSTEM32\ntdll.dll+6ce51'
        win.eventdata.grantedAccess: '0x1014c0'
        win.eventdata.sourceImage: 'C:\windows\system32\svchost.exe'
        win.eventdata.sourceProcessGUID: '{00247c92-5b27-5f74-0000-001045f11200}'
        win.eventdata.sourceProcessId: '11640'
        win.eventdata.sourceThreadId: '25568'
        win.eventdata.targetImage: 'C:\windows\explorer.exe'
        win.eventdata.targetProcessGUID: '{00247c92-858e-5f7b-0000-00106b29202b}'
        win.eventdata.targetProcessId: '27356'
        win.eventdata.utcTime: '2020-10-05 20:43:58.393'
        win.system.channel: 'Microsoft-Windows-Sysmon/Operational'
        win.system.computer: 'LAPTOP-JU4M3I0E'
        win.system.eventID: '10'
        win.system.eventRecordID: '2164888'
        win.system.keywords: '0x8000000000000000'
        win.system.level: '4'
        win.system.message: 'Process accessed:
RuleName:
UtcTime: 2020-10-05 20:43:58.393
SourceProcessGUID: {00247c92-5b27-5f74-0000-001045f11200}
SourceProcessId: 11640
SourceThreadId: 25568
SourceImage: C:\windows\system32\svchost.exe
TargetProcessGUID: {00247c92-858e-5f7b-0000-00106b29202b}
TargetProcessId: 27356
TargetImage: C:\windows\explorer.exe
GrantedAccess: 0x1014C0
CallTrace: C:\windows\SYSTEM32\ntdll.dll+9c534|c:\windows\system32\appinfo.dll+36f8|C:\windows\System32\RPCRT4.dll+76a53|C:\windows\System32\RPCRT4.dll+1ecb|C:\windows\System32\RPCRT4.dll+54998|C:\windows\System32\RPCRT4.dll+2c951|C:\windows\System32\RPCRT4.dll+2c4a0|C:\windows\System32\RPCRT4.dll+1a6bf|C:\windows\System32\RPCRT4.dll+19d1a|C:\windows\System32\RPCRT4.dll+19301|C:\windows\System32\RPCRT4.dll+18d6e|C:\windows\System32\RPCRT4.dll+169a5|C:\windows\SYSTEM32\ntdll.dll+333ed|C:\windows\SYSTEM32\ntdll.dll+34142|C:\windows\System32\KERNEL32.DLL+17bd4|C:\windows\SYSTEM32\ntdll.dll+6ce51
SourceUser: %12
TargetUser: %13'
        win.system.opcode: '0'
        win.system.processID: '5424'
        win.system.providerGuid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}'
        win.system.providerName: 'Microsoft-Windows-Sysmon'
        win.system.severityValue: 'INFORMATION'
        win.system.systemTime: '2020-10-05T20:43:58.3946402Z'
        win.system.task: '10'
        win.system.threadID: '6708'
        win.system.version: '3'

**Phase 3: Completed filtering (rules).
        id: '92910'
        level: '12'
        description: 'Explorer process was accessed by C:\windows\system32\svchost.exe, possible process injection'
        groups: '['sysmon', 'sysmon_eid10_detections', 'windows']'
        firedtimes: '2'
        mail: 'True'
        mitre.id: '['T1055']'
        mitre.tactic: '['Defense Evasion', 'Privilege Escalation']'
        mitre.technique: '['Process Injection']'
**Alert to be generated.
```

The same call, so a second alert will be triggered.

#### Log 4 (20:43:58.449 UTC): Execution of Windows Task Manager

<img src="/assets/uacme-log4.PNG" width="800" alt="Log 4 (20:43:58.449 UTC): Execution of Windows Task Managere">

* The bypass tool Akagi_64.exe launched the Windows Task Manager (Taskmgr.exe) from C:\Windows\System32.
* Task Manager was executed with a "High" integrity level, signifying administrative privileges. This behavior is unusual for attackers as it can alert the user to unauthorized activities. It suggests the attacker may have intended to observe running processes or terminate security tools, along with initiating a child process with high privileges.

```plaintext
**Phase 1: Completed pre-decoding.

**Phase 2: Completed decoding.
        name: 'json'
        win.eventdata.commandLine: 'C:\windows\system32\taskmgr.exe'
        win.eventdata.company: 'Microsoft Corporation'
        win.eventdata.currentDirectory: 'C:\windows\system32\'
        win.eventdata.description: 'Task Manager'
        win.eventdata.fileVersion: '10.0.18362.693 (WinBuild.160101.0800)'
        win.eventdata.hashes: 'SHA1=8A4882EE93E1F23BF9241E4BA0BF7BD67F88A364,MD5=33FACAAB13A58251BF45E9AC958B15FA,SHA256=0AF6B3F8628E38B1551EC76277E482F8A2605B661F57C164C47ACEBB14B1A81B,IMPHASH=98526F50539626C2E9C93297FE2AF83B'
        win.eventdata.image: 'C:\Windows\System32\Taskmgr.exe'
        win.eventdata.integrityLevel: 'High'
        win.eventdata.logonGuid: '{00247c92-8c36-5f75-0000-002034e39103}'
        win.eventdata.logonId: '0x391e334'
        win.eventdata.originalFileName: 'Taskmgr.exe'
        win.eventdata.parentCommandLine: 'Akagi_64.exe  59 cmd.exe'
        win.eventdata.parentImage: 'C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe'
        win.eventdata.parentProcessGuid: '{00247c92-858e-5f7b-0000-00106b29202b}'
        win.eventdata.parentProcessId: '27356'
        win.eventdata.processGuid: '{00247c92-858e-5f7b-0000-00105241202b}'
        win.eventdata.processId: '18404'
        win.eventdata.product: 'Microsoft® Windows® Operating System'
        win.eventdata.terminalSessionId: '2'
        win.eventdata.user: 'LAPTOP-JU4M3I0E\bouss'
        win.eventdata.utcTime: '2020-10-05 20:43:58.449'
        win.system.channel: 'Microsoft-Windows-Sysmon/Operational'
        win.system.computer: 'LAPTOP-JU4M3I0E'
        win.system.eventID: '1'
        win.system.eventRecordID: '2164889'
        win.system.keywords: '0x8000000000000000'
        win.system.level: '4'
        win.system.message: 'Process Create:
RuleName:
UtcTime: 2020-10-05 20:43:58.449
ProcessGuid: {00247c92-858e-5f7b-0000-00105241202b}
ProcessId: 18404
Image: C:\Windows\System32\Taskmgr.exe
FileVersion: 10.0.18362.693 (WinBuild.160101.0800)
Description: Task Manager
Product: Microsoft® Windows® Operating System
Company: Microsoft Corporation
OriginalFileName: Taskmgr.exe
CommandLine: C:\windows\system32\taskmgr.exe
CurrentDirectory: C:\windows\system32\
User: LAPTOP-JU4M3I0E\bouss
LogonGuid: {00247c92-8c36-5f75-0000-002034e39103}
LogonId: 0x391E334
TerminalSessionId: 2
IntegrityLevel: High
Hashes: SHA1=8A4882EE93E1F23BF9241E4BA0BF7BD67F88A364,MD5=33FACAAB13A58251BF45E9AC958B15FA,SHA256=0AF6B3F8628E38B1551EC76277E482F8A2605B661F57C164C47ACEBB14B1A81B,IMPHASH=98526F50539626C2E9C93297FE2AF83B
ParentProcessGuid: {00247c92-858e-5f7b-0000-00106b29202b}
ParentProcessId: 27356
ParentImage: C:\Users\bouss\Downloads\UACME-3.2.6\Source\Akagi\output\x64\Debug\Akagi_64.exe
ParentCommandLine: Akagi_64.exe  59 cmd.exe
ParentUser: %23'
        win.system.opcode: '0'
        win.system.processID: '5424'
        win.system.providerGuid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}'
        win.system.providerName: 'Microsoft-Windows-Sysmon'
        win.system.severityValue: 'INFORMATION'
        win.system.systemTime: '2020-10-05T20:43:58.4502396Z'
        win.system.task: '1'
        win.system.threadID: '6708'
        win.system.version: '5'

**Phase 3: Completed filtering (rules).
        id: '61603'
        level: '0'
        description: 'Sysmon - Event 1: Process creation Task Manager'
        groups: '['windows', 'sysmon', 'sysmon_event1']'
        firedtimes: '1'
        mail: 'False'
```

Creating Task Manager does not look like a suspicious event for Wazuh. However, this is not one of the legitimate parent processes. If you check the triggered rule `61603`, you can see this is a generic rule to be used by child rules.

```xml
  <rule id="61603" level="0">
    <if_sid>61600</if_sid>
    <field name="win.system.eventID">^1$</field>
    <description>Sysmon - Event 1: Process creation $(win.eventdata.description)</description>
    <options>no_full_log</options>
    <group>sysmon_event1,</group>
  </rule>
```

However, there is no rule to detect Task Manager creation so, the rule chain ends here. This is an opportunity. But first, we need to check the logs for the legitimate parents. But it is safe to assume that the legitimate parents can be `explorer.exe`, `cmd.exe`, `powershell.exe` and maybe `pwsh.exe`. Let's create a custom rule that detects this to be able to help our investigation.

```xml
  <rule id="XXXXXX" level="12">
    <if_group>sysmon_event_1</if_group>
    <field name="win.system.parentImage" type="pcre2" negate="yes">(?i)\\cmd\.exe|\\explorer\.exe|\\powershell\.exe|\\pwsh\.exe$</field>
    <field name="win.eventdata.image">^C:\\Windows\\System32\\Taskmgr.exe$</field>
    <description>Task Manager initiated by an unusual parent process: $(win.system.parentImage)</description>
  </rule>
```

#### Log 5 (20:43:58.449 UTC): svchost.exe Accesses Taskmgr.exe

<img src="/assets/uacme-log5.PNG" width="800" alt="Log 5 (20:43:58.449 UTC): svchost.exe Accesses Taskmgr.exe">

* Immediately after Task Manager was created, svchost.exe accessed the new process (Taskmgr.exe) with maximum access rights (0x1FFFFF) aka `PROCESS_ALL_ACCESS`.
* This suggests that svchost.exe was being manipulated as part of the attacker’s workflow, maintaining control over the newly spawned administrative process.

```plaintext
**Phase 1: Completed pre-decoding.

**Phase 2: Completed decoding.
        name: 'json'
        win.eventdata.callTrace: 'C:\windows\SYSTEM32\ntdll.dll+9d8e4|C:\windows\System32\KERNELBASE.dll+59e1a|C:\windows\System32\KERNELBASE.dll+55ec3|C:\windows\System32\KERNEL32.DLL+1c9af|c:\windows\system32\appinfo.dll+2c3d|c:\windows\system32\appinfo.dll+411e|C:\windows\System32\RPCRT4.dll+76a53|C:\windows\System32\RPCRT4.dll+1ecb|C:\windows\System32\RPCRT4.dll+54998|C:\windows\System32\RPCRT4.dll+2c951|C:\windows\System32\RPCRT4.dll+2c4a0|C:\windows\System32\RPCRT4.dll+1a6bf|C:\windows\System32\RPCRT4.dll+19d1a|C:\windows\System32\RPCRT4.dll+19301|C:\windows\System32\RPCRT4.dll+18d6e|C:\windows\System32\RPCRT4.dll+169a5|C:\windows\SYSTEM32\ntdll.dll+333ed|C:\windows\SYSTEM32\ntdll.dll+34142|C:\windows\System32\KERNEL32.DLL+17bd4|C:\windows\SYSTEM32\ntdll.dll+6ce51'
        win.eventdata.grantedAccess: '0x1fffff'
        win.eventdata.sourceImage: 'C:\windows\system32\svchost.exe'
        win.eventdata.sourceProcessGUID: '{00247c92-5b27-5f74-0000-001045f11200}'
        win.eventdata.sourceProcessId: '11640'
        win.eventdata.sourceThreadId: '25568'
        win.eventdata.targetImage: 'C:\windows\system32\taskmgr.exe'
        win.eventdata.targetProcessGUID: '{00247c92-858e-5f7b-0000-00105241202b}'
        win.eventdata.targetProcessId: '18404'
        win.eventdata.utcTime: '2020-10-05 20:43:58.449'
        win.system.channel: 'Microsoft-Windows-Sysmon/Operational'
        win.system.computer: 'LAPTOP-JU4M3I0E'
        win.system.eventID: '10'
        win.system.eventRecordID: '2164890'
        win.system.keywords: '0x8000000000000000'
        win.system.level: '4'
        win.system.message: 'Process accessed:
RuleName:
UtcTime: 2020-10-05 20:43:58.449
SourceProcessGUID: {00247c92-5b27-5f74-0000-001045f11200}
SourceProcessId: 11640
SourceThreadId: 25568
SourceImage: C:\windows\system32\svchost.exe
TargetProcessGUID: {00247c92-858e-5f7b-0000-00105241202b}
TargetProcessId: 18404
TargetImage: C:\windows\system32\taskmgr.exe
GrantedAccess: 0x1FFFFF
CallTrace: C:\windows\SYSTEM32\ntdll.dll+9d8e4|C:\windows\System32\KERNELBASE.dll+59e1a|C:\windows\System32\KERNELBASE.dll+55ec3|C:\windows\System32\KERNEL32.DLL+1c9af|c:\windows\system32\appinfo.dll+2c3d|c:\windows\system32\appinfo.dll+411e|C:\windows\System32\RPCRT4.dll+76a53|C:\windows\System32\RPCRT4.dll+1ecb|C:\windows\System32\RPCRT4.dll+54998|C:\windows\System32\RPCRT4.dll+2c951|C:\windows\System32\RPCRT4.dll+2c4a0|C:\windows\System32\RPCRT4.dll+1a6bf|C:\windows\System32\RPCRT4.dll+19d1a|C:\windows\System32\RPCRT4.dll+19301|C:\windows\System32\RPCRT4.dll+18d6e|C:\windows\System32\RPCRT4.dll+169a5|C:\windows\SYSTEM32\ntdll.dll+333ed|C:\windows\SYSTEM32\ntdll.dll+34142|C:\windows\System32\KERNEL32.DLL+17bd4|C:\windows\SYSTEM32\ntdll.dll+6ce51
SourceUser: %12
TargetUser: %13'
        win.system.opcode: '0'
        win.system.processID: '5424'
        win.system.providerGuid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}'
        win.system.providerName: 'Microsoft-Windows-Sysmon'
        win.system.severityValue: 'INFORMATION'
        win.system.systemTime: '2020-10-05T20:43:58.4505228Z'
        win.system.task: '10'
        win.system.threadID: '6708'
        win.system.version: '3'

**Phase 3: Completed filtering (rules).
        id: '61612'
        level: '0'
        description: 'Sysmon - Event 10: C:\windows\system32\taskmgr.exe process accessed by C:\windows\system32\svchost.exe'
        groups: '['windows', 'sysmon', 'sysmon_event_10']'
        firedtimes: '2'
        mail: 'False'
```

Oh no! This is not detected as well. We can use the same draft we created. But mind that Sysmon Event ID 1 has a `ParentImage` field, while Event ID 10 has `SourceImage`. Therefore, we cannot just extend the previous rule, we need a new one.

```xml
  <rule id="XXXXXX" level="12">
    <if_group>sysmon_event_10</if_group>
    <field name="win.system.sourceImage" type="pcre2" negate="yes">(?i)\\cmd\.exe|\\explorer\.exe|\\powershell\.exe|\\pwsh\.exe$</field>
    <field name="win.eventdata.image" negate="yes">^C:\\Windows\\System32\\Taskmgr.exe$</field>
    <description>Task Manager accessed by an unusual process: $(win.system.sourceImage)</description>
  </rule>
```

But this is not enough. It is still nothing but noise. In order to make this alert an actionable insight, we need to add more details regarding the `grantedAccess` field but I am leaving this to you.

#### Log 6 (20:43:58.450 UTC): explorer.exe Accesses Taskmgr.exe

<img src="/assets/uacme-log6.PNG" width="800" alt="Log 6 (20:43:58.450 UTC): explorer.exe Accesses Taskmgr.exe">

* Following svchost.exe, the explorer.exe process accessed Taskmgr.exe. The granted access rights (0x12367B) suggest this was a standard interaction initiated by the desktop shell for process visibility or integration with the Task Manager GUI.
* This interaction likely reflects normal system behavior rather than malicious intent.

```plaintext
**Phase 1: Completed pre-decoding.

**Phase 2: Completed decoding.
        name: 'json'
        win.eventdata.callTrace: 'C:\windows\SYSTEM32\ntdll.dll+9f9c4|C:\windows\System32\KERNELBASE.dll+f8af6|C:\windows\explorer.exe+33be5|C:\windows\explorer.exe+31288|C:\windows\explorer.exe+316f2|C:\windows\explorer.exe+1dea1|C:\windows\explorer.exe+1e070|C:\windows\explorer.exe+428d2|C:\windows\SYSTEM32\VCRUNTIME140D.dll+1be5b|C:\windows\explorer.exe+3dcd6|C:\windows\SYSTEM32\ntdll.dll+a11cf|C:\windows\SYSTEM32\ntdll.dll+6a209|C:\windows\SYSTEM32\ntdll.dll+9fe3e|C:\windows\explorer.exe+1d29d|C:\windows\System32\KERNEL32.DLL+17bd4|C:\windows\SYSTEM32\ntdll.dll+6ce51'
        win.eventdata.grantedAccess: '0x12367b'
        win.eventdata.sourceImage: 'C:\windows\explorer.exe'
        win.eventdata.sourceProcessGUID: '{00247c92-858e-5f7b-0000-00106b29202b}'
        win.eventdata.sourceProcessId: '27356'
        win.eventdata.sourceThreadId: '4732'
        win.eventdata.targetImage: 'C:\windows\system32\taskmgr.exe'
        win.eventdata.targetProcessGUID: '{00247c92-858e-5f7b-0000-00105241202b}'
        win.eventdata.targetProcessId: '18404'
        win.eventdata.utcTime: '2020-10-05 20:43:58.450'
        win.system.channel: 'Microsoft-Windows-Sysmon/Operational'
        win.system.computer: 'LAPTOP-JU4M3I0E'
        win.system.eventID: '10'
        win.system.eventRecordID: '2164891'
        win.system.keywords: '0x8000000000000000'
        win.system.level: '4'
        win.system.message: 'Process accessed:
RuleName:
UtcTime: 2020-10-05 20:43:58.450
SourceProcessGUID: {00247c92-858e-5f7b-0000-00106b29202b}
SourceProcessId: 27356
SourceThreadId: 4732
SourceImage: C:\windows\explorer.exe
TargetProcessGUID: {00247c92-858e-5f7b-0000-00105241202b}
TargetProcessId: 18404
TargetImage: C:\windows\system32\taskmgr.exe
GrantedAccess: 0x12367B
CallTrace: C:\windows\SYSTEM32\ntdll.dll+9f9c4|C:\windows\System32\KERNELBASE.dll+f8af6|C:\windows\explorer.exe+33be5|C:\windows\explorer.exe+31288|C:\windows\explorer.exe+316f2|C:\windows\explorer.exe+1dea1|C:\windows\explorer.exe+1e070|C:\windows\explorer.exe+428d2|C:\windows\SYSTEM32\VCRUNTIME140D.dll+1be5b|C:\windows\explorer.exe+3dcd6|C:\windows\SYSTEM32\ntdll.dll+a11cf|C:\windows\SYSTEM32\ntdll.dll+6a209|C:\windows\SYSTEM32\ntdll.dll+9fe3e|C:\windows\explorer.exe+1d29d|C:\windows\System32\KERNEL32.DLL+17bd4|C:\windows\SYSTEM32\ntdll.dll+6ce51
SourceUser: %12
TargetUser: %13'
        win.system.opcode: '0'
        win.system.processID: '5424'
        win.system.providerGuid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}'
        win.system.providerName: 'Microsoft-Windows-Sysmon'
        win.system.severityValue: 'INFORMATION'
        win.system.systemTime: '2020-10-05T20:43:58.4507701Z'
        win.system.task: '10'
        win.system.threadID: '6708'
        win.system.version: '3'

**Phase 3: Completed filtering (rules).
        id: '61612'
        level: '0'
        description: 'Sysmon - Event 10: C:\windows\system32\taskmgr.exe process accessed by C:\windows\explorer.exe'
        groups: '['windows', 'sysmon', 'sysmon_event_10']'
        firedtimes: '3'
        mail: 'False'
```

Wazuh does not create an alert as it is expected for `explorer.exe` to access `taskmgr.exe`. Even with our previous rule, this log would be ignored.

#### Log 7 (20:43:58.450 UTC): Creation of Command Prompt (cmd.exe)

<img src="/assets/uacme-log7.PNG" width="800" alt="Log 7 (20:43:58.450 UTC): Creation of Command Prompt (cmd.exe)">

* Task Manager (Taskmgr.exe) launched a Command Prompt process (cmd.exe) in high integrity mode, signifying that the attacker now had an elevated command-line interface.
* With administrative-level privileges, the attacker could execute further commands, deploy payloads, or modify system configurations for persistence or data exfiltration.

```plaintext
**Phase 1: Completed pre-decoding.

**Phase 2: Completed decoding.
        name: 'json'
        win.eventdata.commandLine: 'cmd.exe'
        win.eventdata.company: 'Microsoft Corporation'
        win.eventdata.currentDirectory: 'C:\windows\'
        win.eventdata.description: 'Windows Command Processor'
        win.eventdata.fileVersion: '10.0.18362.449 (WinBuild.160101.0800)'
        win.eventdata.hashes: 'SHA1=8DCA9749CD48D286950E7A9FA1088C937CBCCAD4,MD5=D7AB69FAD18D4A643D84A271DFC0DBDF,SHA256=FF79D3C4A0B7EB191783C323AB8363EBD1FD10BE58D8BCC96B07067743CA81D5,IMPHASH=272245E2988E1E430500B852C4FB5E18'
        win.eventdata.image: 'C:\Windows\System32\cmd.exe'
        win.eventdata.integrityLevel: 'High'
        win.eventdata.logonGuid: '{00247c92-8c36-5f75-0000-002034e39103}'
        win.eventdata.logonId: '0x391e334'
        win.eventdata.originalFileName: 'Cmd.Exe'
        win.eventdata.parentCommandLine: 'C:\windows\system32\taskmgr.exe'
        win.eventdata.parentImage: 'C:\Windows\System32\Taskmgr.exe'
        win.eventdata.parentProcessGuid: '{00247c92-858e-5f7b-0000-00105241202b}'
        win.eventdata.parentProcessId: '18404'
        win.eventdata.processGuid: '{00247c92-858e-5f7b-0000-0010e741202b}'
        win.eventdata.processId: '6636'
        win.eventdata.product: 'Microsoft® Windows® Operating System'
        win.eventdata.terminalSessionId: '2'
        win.eventdata.user: 'LAPTOP-JU4M3I0E\bouss'
        win.eventdata.utcTime: '2020-10-05 20:43:58.450'
        win.system.channel: 'Microsoft-Windows-Sysmon/Operational'
        win.system.computer: 'LAPTOP-JU4M3I0E'
        win.system.eventID: '1'
        win.system.eventRecordID: '2164892'
        win.system.keywords: '0x8000000000000000'
        win.system.level: '4'
        win.system.message: 'Process Create:
RuleName:
UtcTime: 2020-10-05 20:43:58.450
ProcessGuid: {00247c92-858e-5f7b-0000-0010e741202b}
ProcessId: 6636
Image: C:\Windows\System32\cmd.exe
FileVersion: 10.0.18362.449 (WinBuild.160101.0800)
Description: Windows Command Processor
Product: Microsoft® Windows® Operating System
Company: Microsoft Corporation
OriginalFileName: Cmd.Exe
CommandLine: cmd.exe
CurrentDirectory: C:\windows\
User: LAPTOP-JU4M3I0E\bouss
LogonGuid: {00247c92-8c36-5f75-0000-002034e39103}
LogonId: 0x391E334
TerminalSessionId: 2
IntegrityLevel: High
Hashes: SHA1=8DCA9749CD48D286950E7A9FA1088C937CBCCAD4,MD5=D7AB69FAD18D4A643D84A271DFC0DBDF,SHA256=FF79D3C4A0B7EB191783C323AB8363EBD1FD10BE58D8BCC96B07067743CA81D5,IMPHASH=272245E2988E1E430500B852C4FB5E18
ParentProcessGuid: {00247c92-858e-5f7b-0000-00105241202b}
ParentProcessId: 18404
ParentImage: C:\Windows\System32\Taskmgr.exe
ParentCommandLine: C:\windows\system32\taskmgr.exe
ParentUser: %23'
        win.system.opcode: '0'
        win.system.processID: '5424'
        win.system.providerGuid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}'
        win.system.providerName: 'Microsoft-Windows-Sysmon'
        win.system.severityValue: 'INFORMATION'
        win.system.systemTime: '2020-10-05T20:43:58.4513146Z'
        win.system.task: '1'
        win.system.threadID: '6708'
        win.system.version: '5'

**Phase 3: Completed filtering (rules).
        id: '92052'
        level: '4'
        description: 'Windows command prompt started by an abnormal process'
        groups: '['sysmon', 'sysmon_eid1_detections', 'windows']'
        firedtimes: '1'
        mail: 'False'
        mitre.id: '['T1059.003']'
        mitre.tactic: '['Execution']'
        mitre.technique: '['Windows Command Shell']'
**Alert to be generated.
```

Well, this is weird. While the rule is correct that it is not a usual parent process, the severity is lower than I expected. Let's check the rule first.

```xml
  <rule id="92052" level="4">
    <if_group>sysmon_event1</if_group>
    <field name="win.eventdata.originalFileName" type="pcre2">(?i)cmd\.EXE</field>
    <field name="win.eventdata.parentImage" type="pcre2" negate="yes">(?i)(explorer|cmd)\.EXE</field>
    <options>no_full_log</options>
    <description>Windows command prompt started by an abnormal process</description>
    <mitre>
      <id>T1059.003</id>
    </mitre>
  </rule>
```

This rule is almost the same as the rule I have created above but for `cmd.exe`. However, unlike mine, the level for this rule is set to 4. Looking at the Rule Classification it makes sense. Now, should I also fall back to level 4? It is up to the detection rule and how fine-grained it is. For instance, we can write a child rule over this that checks the integrity levels. If you don't know why we do this, I suggest having a look at [Better know a data source: Process integrity levels](https://redcanary.com/blog/threat-detection/better-know-a-data-source/process-integrity-levels/) by Red Canary.

```xml
  <rule id="XXXXXX" level="12">
    <if_sid>92052</if_sid>
    <field name="win.eventdata.integrityLevel">^High|System$</field>
    <description>Windows command prompt started by an abnormal process with high privileges</description>
  </rule>
```

#### So what?

Out of 7 logs, here's the timeline of alerts:

| Date-time | Event | Wazuh alert level | Remarks |
|---|---|---|---|
| 20:43:58.350 UTC | Initial Execution of UACMe (Akagi_64.exe) | 0 | No alerts |
| 20:43:58.389 UTC | svchost.exe Accesses explorer.exe         | 12 | Process injection detected. Good job! |
| 20:43:58.393 UTC | Repeated Access of explorer.exe by svchost.exe | 12 | Same, once again. Weird but it is detected. So, score for Wazuh. |
| 20:43:58.449 UTC | Execution of Windows Task Manager | 0 | I created a separate rule for this, though level 12 might be overkill as is. I cannot use an integrity level check here as the Task Manager always runs with a `High` integrity level. |
| 20:43:58.449 UTC | svchost.exe Accesses Taskmgr.exe | 0 | Also no-alert. I have created another detection rule for this as well. |
| 20:43:58.450 UTC | explorer.exe Accesses Taskmgr.exe | 0 | The generated alert level is 0, but it is expected. This is not a malicious act. |
| 20:43:58.450 UTC | Creation of Command Prompt (cmd.exe) | 4 | This one catches the anomaly. However, it is not helping with alert level 4. It is helpful for threat hunting but not for detection. I decided to write a more specific rule that checks for privilege escalation. |

Now, you can try the same with many types of attacks to test your detection capabilities. It is seen that the base ruleset is good but there's always room for improvement. I also excluded adding `groups` and `mitre` tags for the sake of brevity. That must be considered.

### Conclusion

`wazuh-logtest` is a very minimal but usable tool for Wazuh users to test and refine custom rules, but its limitation with Windows event logs has long been a challenge. With `wazuhevtx`, you can now convert EVTX files into Wazuh-compatible JSON logs, enabling comprehensive rule testing for Windows event logs. You can replay known attacks to assess your defences.

Get the Tool: [wazuhevtx GitHub Repository](https://github.com/zbalkan/wazuhevtx)

### Postscriptum

This tool requires manual interaction with the `wazuh-logtest` tool as the tool resides on the Wazuh manager nodes of your -hopefully- test environment. Also, you need a workaround mentioned in Step 2 above to test that you may not want in your production environment. You may need to automate this in the long run. I have another tool that I have been developing for creating a development environment on your workstation. It will be another article's topic.

<img src="/assets/testenv.jpeg" width="400" alt="Test environment meme">

### Postscriptum 2

Thanks to [Birol Capa](https://github.com/birolcapa) for [his article](https://birolcapa.github.io/software/2021/09/24/how-to-read-evtx-file-using-python.html) pointing to the simplest way to parse EVTX files. Before that, I tried many different solutions that were limited by means of capabilities after some point.

---

[^1] As a side note, this is valid for 4.x versions and earlier. The upcoming version, Wazuh 5.0 may or may not need it.
[^2] You can try to initiate `wazuh-logtest` like this `/var/ossec/bin/wazuh-logtest -l EventChannel`, but you cannot fool analysisd. You still need the workaround.
[^3] Do not give arbitrary levels to your custom rules. Always check the Rules Classification document. If your alert does not fit any of them, you can pick a reasonable approximation of course. These are guidelines, not rules (no pun intended).
