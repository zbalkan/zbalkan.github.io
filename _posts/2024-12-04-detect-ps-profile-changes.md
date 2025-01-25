---
title: "Detect PowerShell Profile modifications with Wazuh"
tags:
  - Wazuh
  - Detection
  - SIEM
  - T1546.013
  - PowerShell
  - Persistence
  - Privilege Escalation
redirect_from: /2024/12/04/detect-ps-profile-changes.html
---

This is another post targeting IT and cyber security professionals who have experience or are planning to evaluate Wazuh in a production environment. I included explanations for clarity; otherwise, this would have been a shorter read.

[PowerShell profiles](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles?view=powershell-7.4) are highly versatile, customizable script files that load automatically when a PowerShell session starts. They allow users or administrators to [configure their environment](https://www.sans.org/blog/month-of-powershell-power-profile/) by defining variables, aliases, functions, or importing modules. There are different types of profiles, including those scoped for all users, specific users, or individual hosts, with paths varying by PowerShell version and operating system.

<!--more-->

In your PowerShell console, you can use the `$PROFILE` variable to display your current profile, which is the same as `$PROFILE.CurrentUserCurrentHost`. This profile applies to the current user and the current host application. To explore profiles in other scopes, you can use `$PROFILE.CurrentUserAllHosts`, `$PROFILE.AllUsersCurrentHost`, and `$PROFILE.AllUsersAllHosts`.

Editing `$PROFILE.CurrentUserCurrentHost` and `$PROFILE.CurrentUserAllHosts` does not require any additional privileges beyond those of the logged-in user. However, modifying `$PROFILE.AllUsersCurrentHost` and `$PROFILE.AllUsersAllHosts` typically requires higher privileges because these profiles affect all users on the system. Below are the Access Control Lists (ACLs) I created in the lab for comparison. These profile files do not exist by default; you need to create them intentionally.

<img src="/assets/PS5_currentUser.PNG" width="600" alt="PowerShell 5.1 Current User, Current Host and All Hosts scopes">
<img src="/assets/PS5_allUsers.PNG" width="600" alt="PowerShell 5.1 All Users, Current Host and All Hosts scopes">
<img src="/assets/PS7_currentUser.PNG" width="600" alt="PowerShell 7 Current User, Current Host and All Hosts scopes">
<img src="/assets/PS7_allUsers.PNG" width="600" alt="PowerShell 7 All Users, Current Host and All Hosts scopes">

While invaluable for personalization and automation, these profiles are equally susceptible to exploitation. PowerShell profile modification is a persistence mechanism (see [MITRE ATT&CK T1546.013](https://attack.mitre.org/techniques/T1546/013/)) that attackers use to execute code every time a PowerShell session is opened. By adding malicious code to a PowerShell profile, attackers can repeatedly run commands without re-establishing access, establishing a persistent foothold in the system. I briefly mentioned this in my [previous post](https://zaferbalkan.com/psreadline.html) very briefly, and here I provide a detailed example.

This technique becomes especially risky when the compromised PowerShell session runs with administrator privileges, allowing attackers to execute commands with elevated rights across the system. Detecting these profile modifications is crucial for mitigating the risks of privileged code execution that could escalate attacks or enable lateral movement.

In the next sections, we’ll look at two ways to detect these modifications in Wazuh using File Integrity Monitoring (FIM) for straightforward tracking.

### FIM Configuration

File Integrity Monitoring (FIM) is a security technology that tracks changes to files, directories, and system configurations to detect unauthorized or suspicious modifications. By comparing the current state of files against a known baseline, FIM can identify changes that may highlight malicious activity, such as tampering with critical system files, application configurations, or logs. Often used in compliance frameworks like PCI DSS and HIPAA, FIM is a vital tool for maintaining the integrity of systems, identifying potential breaches, and supporting forensic investigations in the event of an incident.

If you’ve made it this far, you are likely familiar with Wazuh and its FIM capabilities. If you’re new to this, refer to the [official documentation](https://documentation.wazuh.com/current/user-manual/capabilities/file-integrity/index.html) for a comprehensive understanding of its functionality, setup, and applications. I want to mention that while the name focuses on change management for files, it also monitors the Windows registry because it is analogous to the `/etc/` directory in UNIX-like systems. Change is inevitable, and monitoring it is the first step. Refer to [enable change](https://www.axelos.com/resource-hub/blog/itil_4_practitioner_change_enablement) if you haven’t given thought to the "change management vs. change enablement" debate.

I suggest you use a centralized configuration for this setup. I prefer testing it with a custom endpoint group, and placing this inside the `syscheck` section. For the sake of brevity, I only added the XML tags regarding the paths. Apply this configuration to the test group and wait for `keepalive` to update it. Note that new paths may not be checked until a full inventory scan is complete. I recommend restarting the agents either locally or remotely via DevTools using the `PUT /agents/group/<test group name>/restart` command.

With the configuration below, you can enable real-time detection. I didn't use the `restrict` attribute since the real-time detection works with directories. **Real-time change detection is temporarily interrupted during scheduled FIM module scans and resumes once the scans are complete.** Therefore you need to wait for this rule to be triggered until the initial/periodical `syscheck` scan gets finalized.

```xml
      <!-- PowerShell 7 -->
      <directories check_all="yes" whodata="yes" realtime="yes" recursion_level="0" report_changes="yes">%SYSTEMDRIVE%\Program Files\PowerShell\7</directories>
      <directories check_all="yes" whodata="yes" realtime="yes" recursion_level="0" report_changes="yes">%SYSTEMDRIVE%\Users\*\Documents\PowerShell</directories>
      <!-- PowerShell 5.1 -->
      <directories check_all="yes" whodata="yes" realtime="yes" recursion_level="0">%WINDIR%\System32\WindowsPowerShell\v1.0</directories>
      <directories check_all="yes" whodata="yes" realtime="yes" recursion_level="0" report_changes="yes">%SYSTEMDRIVE%\Users\*\Documents\WindowsPowerShell</directories>

      <!-- Sysmon rules as a binary blob in registry -->
      <windows_registry arch="both">HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\SysmonDrv\Parameters\Rules</windows_registry>
```

You can see that I added a registry setting along with the parameters. This ensures that Sysmon configuration changes are monitored. While Sysmon has event logs to let us know about the changes, if an attacker needs to silence the Sysmon alerts, they can modify this blob directly for stealth.

### Rules for FIM

```xml
<!-- T1546.013 Event Triggered Execution: PowerShell Profile -->
<group name="nets-custom,syscheck,powershell,">

    <rule id="750151" level="10">
        <if_sid>550,553,554</if_sid>
        <field name="file" type="pcre2">(?i)[c-z]\:(?:\\Windows\\System32\\WindowsPowerShell\\v1\.0|\\Program Files\\PowerShell\\7)\\Profile\.ps1</field>
        <description>PowerShell PROFILE updated on Windows for All Users, All Hosts</description>
        <group>ossec,syscheck,syscheck_file,pci_dss_11.5,gpg13_4.11,gdpr_II_5.1.f,hipaa_164.312.c.1,hipaa_164.312.c.2,nist_800_53_SI.7,tsc_PI1.4,tsc_PI1.5,tsc_CC6.1,tsc_CC6.8,tsc_CC7.2,tsc_CC7.3,</group>
        <mitre>
            <id>T1546.013</id>
        </mitre>
    </rule>

    <rule id="750152" level="10">
        <if_sid>550,553,554</if_sid>
        <field name="file" type="pcre2">\/opt\/microsoft\/powershell\/7\/profile\.ps1</field>
        <description>PowerShell PROFILE updated on Linux for All Users, All Hosts</description>
        <group>ossec,syscheck,syscheck_file,pci_dss_11.5,gpg13_4.11,gdpr_II_5.1.f,hipaa_164.312.c.1,hipaa_164.312.c.2,nist_800_53_SI.7,tsc_PI1.4,tsc_PI1.5,tsc_CC6.1,tsc_CC6.8,tsc_CC7.2,tsc_CC7.3,</group>
        <mitre>
            <id>T1546.013</id>
        </mitre>
    </rule>

    <rule id="750153" level="10">
        <if_sid>550,553,554</if_sid>
        <field name="file" type="pcre2">(?i)[c-z]\:(?:\\Windows\\System32\\WindowsPowerShell\\v1\.0|\\Program Files\\PowerShell\\7)\\Microsoft.PowerShell_profile\.ps1</field>
        <description>PowerShell PROFILE updated on Windows for All Users, Current Host</description>
        <group>ossec,syscheck,syscheck_file,pci_dss_11.5,gpg13_4.11,gdpr_II_5.1.f,hipaa_164.312.c.1,hipaa_164.312.c.2,nist_800_53_SI.7,tsc_PI1.4,tsc_PI1.5,tsc_CC6.1,tsc_CC6.8,tsc_CC7.2,tsc_CC7.3,</group>
        <mitre>
            <id>T1546.013</id>
        </mitre>
    </rule>

    <rule id="750154" level="10">
        <if_sid>550,553,554</if_sid>
        <field name="file" type="pcre2">\/opt\/microsoft\/powershell\/7\/Microsoft\.PowerShell_profile\.ps1</field>
        <description>PowerShell PROFILE updated on Linux for All Users, Current Host</description>
        <group>ossec,syscheck,syscheck_file,pci_dss_11.5,gpg13_4.11,gdpr_II_5.1.f,hipaa_164.312.c.1,hipaa_164.312.c.2,nist_800_53_SI.7,tsc_PI1.4,tsc_PI1.5,tsc_CC6.1,tsc_CC6.8,tsc_CC7.2,tsc_CC7.3,</group>
        <mitre>
            <id>T1546.013</id>
        </mitre>
    </rule>

    <rule id="750155" level="10">
        <if_sid>550,553,554</if_sid>
        <field name="file" type="pcre2">(?i)[c-z]\:(?:\\Users\\.+\\)Documents\\PowerShell\\Profile\.ps1</field>
        <description>PowerShell PROFILE updated on Windows for Current User, All Hosts</description>
        <group>ossec,syscheck,syscheck_file,pci_dss_11.5,gpg13_4.11,gdpr_II_5.1.f,hipaa_164.312.c.1,hipaa_164.312.c.2,nist_800_53_SI.7,tsc_PI1.4,tsc_PI1.5,tsc_CC6.1,tsc_CC6.8,tsc_CC7.2,tsc_CC7.3,</group>
        <mitre>
            <id>T1546.013</id>
        </mitre>
    </rule>

    <rule id="750156" level="10">
        <if_sid>550,553,554</if_sid>
        <field name="file" type="pcre2">\/home\/.+\/\.config\/powershell\/profile\.ps1</field>
        <description>PowerShell PROFILE updated on Linux for Current User, All Hosts</description>
        <group>ossec,syscheck,syscheck_file,pci_dss_11.5,gpg13_4.11,gdpr_II_5.1.f,hipaa_164.312.c.1,hipaa_164.312.c.2,nist_800_53_SI.7,tsc_PI1.4,tsc_PI1.5,tsc_CC6.1,tsc_CC6.8,tsc_CC7.2,tsc_CC7.3,</group>
        <mitre>
            <id>T1546.013</id>
        </mitre>
    </rule>

    <rule id="750157" level="10">
        <if_sid>550,553,554</if_sid>
        <field name="file" type="pcre2">(?i)[c-z]\:\\Users\\.+\\Documents\\PowerShell\\Microsoft\.PowerShell_profile\.ps1</field>
        <description>PowerShell PROFILE updated on Windows for Current User, Current Host</description>
        <group>ossec,syscheck,syscheck_file,pci_dss_11.5,gpg13_4.11,gdpr_II_5.1.f,hipaa_164.312.c.1,hipaa_164.312.c.2,nist_800_53_SI.7,tsc_PI1.4,tsc_PI1.5,tsc_CC6.1,tsc_CC6.8,tsc_CC7.2,tsc_CC7.3,</group>
        <mitre>
            <id>T1546.013</id>
        </mitre>
    </rule>

    <rule id="750158" level="10">
        <if_sid>550,553,554</if_sid>
        <field name="file" type="pcre2">\/home\/.+\/\.config\/powershell\/Microsoft\.PowerShell_profile\.ps1</field>
        <description>PowerShell PROFILE updated on Linux for Current User, Current Host</description>
        <group>ossec,syscheck,syscheck_file,pci_dss_11.5,gpg13_4.11,gdpr_II_5.1.f,hipaa_164.312.c.1,hipaa_164.312.c.2,nist_800_53_SI.7,tsc_PI1.4,tsc_PI1.5,tsc_CC6.1,tsc_CC6.8,tsc_CC7.2,tsc_CC7.3,</group>
        <mitre>
            <id>T1546.013</id>
        </mitre>
    </rule>

    <rule id="750159" level="10">
        <if_sid>594,597,598,750,751,752</if_sid>
        <field name="file" type="pcre2">HKLM\\SYSTEM\\CurrentControlSet\\Services\\SysmonDrv\\Parameters\\Rules</field>
        <description>Sysmon configuration is updated.</description>
        <group>ossec,syscheck,syscheck_registry,</group>
    </rule>

    <rule id="750160" level="2" frequency="1" timeframe="10">
      <if_matched_sid>61644</if_matched_sid>
      <if_sid>750159</if_sid>
      <description>Suppress legitimate changes if an event log is created within the last 10 seconds.</description>
    </rule>

</group>
```

### What is next?

Once the rules are configured and the system is monitoring changes, Wazuh will begin generating alerts for detected modifications. For example:

- Alerts may indicate a modification to `$PROFILE` within the defined scopes.
- Registry changes to Sysmon's configuration parameters will also trigger alerts, aiding in the detection of potential tampering with logging mechanisms.

<img src="/assets/wazuh-fim-profile.png" width="600" alt="Voila!">

Next, refine these rules and create more tailored detections specific to your environment. Investigate detected changes promptly and document legitimate updates to minimize false positives.
