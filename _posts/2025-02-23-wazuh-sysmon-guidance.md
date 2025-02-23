---
title: "Fine tuning Sysmon configuration for Wazuh"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Windows Event Log
  - Sysmon
---

[Sysmon](https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon) is the go-to utility for most of those who want more visibility on their Windows endpoints. Sysadmins or security engineers try to utilize known good baselines instead of configuring manually. Generally, this baseline is either [SwiftOnSecurity](https://github.com/SwiftOnSecurity/sysmon-config) or [Olaf Hartong's work](https://github.com/olafhartong/sysmon-modular).

Sysmon is amazing with the ability it provides for visibility. You can find the [articles](https://wazuh.com/search/?s=sysmon) that use Sysmon with Wazuh on the official blog.

I want to mention some basics to ensure we are on the same page:

1. Sysmon is not a replacement for an SIEM or EDR.
2. Sysmon is a service which provides non-default, rich log and telemetry capabilities for Windows endpoints.
3. Sysmon [event IDs](https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon#events) allow new data sources to become visible to defenders.
4. **Rich** in the context of [data sources](https://attack.mitre.org/datasources/) also means **noise**. Beware of lots and lots of logs.
5. Collect what you need, nothing more, nothing less. I'd like to quote [Alex Teixeira](https://detect.fyi/sysmon-a-viable-alternative-to-edr-44d4fbe5735a):

> Storing even the richest log data has little to no detection value until it is actively consumed (Detection).

## Fine-tuning for Wazuh

I'd like to note that if you are using Wazuh, just like any SIEM, you need some fine-tuning and tailoring for your environment. Then, you need a continuous fine-tuning process during the lifetime. As a *filter-at-source* mechanism for your SIEM, Sysmon needs sane configurations as well. I have mentioned that the users generally stick to the well-known configurations. Before even adapting to your own environment, we can modify those configurations for Wazuh by comparing the File Integrity Monitoring (FIM) capabilities to Sysmon. This level of filtering helps you optimize the load. Analyze the table below for a comparison.

| Event ID | Name | Covered by Wazuh FIM | Atomic Rule ID | Rule Group | Child rule files | Data Source [^1] |
|---:|---|---|---:|---|---|---:|
| 1 | Process creation || 61603 | sysmon_event1 | 0800-sysmon_id_1.xml | [Process](https://attack.mitre.org/datasources/DS0009/) |
| 2 | A process changed a file creation time | FIM | 61604 | sysmon_event_2 || [File](https://attack.mitre.org/datasources/DS0022/) |
| 3 | Network connection || 61605 | sysmon_event3 | 0810-sysmon_id_3.xml | [Network Traffic](https://attack.mitre.org/datasources/DS0029/) |
| 4 | Sysmon service state changed || 61606 | sysmon_event4 || [Service](https://attack.mitre.org/datasources/DS0019/) |
| 5 | Process terminated || 61607 | sysmon_event5 || [Process](https://attack.mitre.org/datasources/DS0009/) |
| 6 | Driver loaded || 61608 | sysmon_event6 || [Driver](https://attack.mitre.org/datasources/DS0027/) |
| 7 | Image loaded || 61609 | sysmon_event7 | 0820-sysmon_id_7.xml | [Module](https://attack.mitre.org/datasources/DS0011/) |
| 8 | CreateRemoteThread || 61610 | sysmon_event8 | 0870-sysmon_id_8.xml | [Process](https://attack.mitre.org/datasources/DS0009/) |
| 9 | RawAccessRead || 61611 | sysmon_event9 || [File](https://attack.mitre.org/datasources/DS0022/) |
| 10 | ProcessAccess || 61612 | sysmon_event_10 | 0945-sysmon_id_10.xml | [Process](https://attack.mitre.org/datasources/DS0009/) |
| 11 | FileCreate | FIM | 61613 | sysmon_event_11 | 0830-sysmon_id_11.xml | [File](https://attack.mitre.org/datasources/DS0022/) |
| 12 | RegistryEvent (Object create and delete) | FIM | 61614 | sysmon_event_12 || [Windows Registry](https://attack.mitre.org/datasources/DS0024/) |
| 13 | RegistryEvent (Value Set) | FIM | 61615 | sysmon_event_13 | 0860-sysmon_id_13.xml | [Windows Registry](https://attack.mitre.org/datasources/DS0024/) |
| 14 | RegistryEvent (Key and Value Rename) | FIM | 61616 | sysmon_event_14 || [Windows Registry](https://attack.mitre.org/datasources/DS0024/) |
| 15 | FileCreateStreamHash || 61617 | sysmon_event_15 || [File](https://attack.mitre.org/datasources/DS0022/) |
| 16 | ServiceConfigurationChange || 61644 | sysmon_event_16 || [Service](https://attack.mitre.org/datasources/DS0019/) |
| 17 | PipeEvent (Pipe Created) || 61645 | sysmon_event_17 || [Named Pipe](https://attack.mitre.org/datasources/DS0023/) |
| 18 | PipeEvent (Pipe Connected) || 61646 | sysmon_event_18 || [Named Pipe](https://attack.mitre.org/datasources/DS0023/) |
| 19 | WmiEvent (WmiEventFilter activity detected) || 61647 | sysmon_event_19 || [WMI](https://attack.mitre.org/datasources/DS0005/) |
| 20 | WmiEvent (WmiEventConsumer activity detected) || 61648 | sysmon_event_20 | 0950-sysmon_id_20.xml | [WMI](https://attack.mitre.org/datasources/DS0005/) |
| 21 | WmiEvent (WmiEventConsumerToFilter activity detected) || 61649 | sysmon_event_21 || [WMI](https://attack.mitre.org/datasources/DS0005/) |
| 22 | DNSEvent (DNS query) || 61650 | sysmon_event_22 || [Network Traffic](https://attack.mitre.org/datasources/DS0029/) |
| 23 | FileDelete (File Delete archived) | FIM (Wazuh does not keep the copy) | 61651 | sysmon_event_23 || [File](https://attack.mitre.org/datasources/DS0022/) |
| 24 | ClipboardChange (New content in the clipboard) || 61652 | sysmon_event_24 || [Process](https://attack.mitre.org/datasources/DS0009/)  or [Command](https://attack.mitre.org/datasources/DS0017/) |
| 25 | ProcessTampering (Process image change) || 61653 | sysmon_event_25 || [Process](https://attack.mitre.org/datasources/DS0009/) |
| 26 | FileDeleteDetected (File Delete logged) | FIM | 61654 | sysmon_event_26 || [File](https://attack.mitre.org/datasources/DS0022/) |
| 27 | FileBlockExecutable ||||| [File](https://attack.mitre.org/datasources/DS0022/) |
| 28 | FileBlockShredding ||||| [File](https://attack.mitre.org/datasources/DS0022/) |
| 29 | FileExecutableDetected ||||| [File](https://attack.mitre.org/datasources/DS0022/) |
| 255 | Error || 61606 | sysmon_event_255 |||

You can see that most of the Sysmon event IDs have a matching Wazuh rule ID that creates a group. These definitions can be found in the primary rule file on Sysmon, `0595-win-sysmon_rules.xml`. Some newer events are not covered, so you may need custom rules if you want to benefit from them. You can find that some rules have better coverage with specific child rule files, showing the significance of detections, developed by the Wazuh team.

Under the circumstances, you need to follow these steps if you want to make the most of your setup:

- Pick your baseline
- Exclude events covered by FIM
- Either
  - Write custom rules for Sysmon events not covered by the default ruleset, or
  - Exclude those events in your Sysmon configuration to minimize the load[^2].

This approach will give you the best of both worlds. To help other Wazuh users, I provided modified versions of the most popular Sysmon configurations in gists. Please compare the original versions against the ones I shared to understand what has been suppressed.

Enjoy!

## Updated `sysmonconfig.xml` by SwiftOnSecurity

The [original project](https://github.com/SwiftOnSecurity/sysmon-config) has not been updated for years, though it is still being used actively.

<script src="https://gist.github.com/zbalkan/8312a6d4e0a7610eccfd342e329cdaab.js"></script>

## Updated `sysmonconfig.xml` by Olaf Hartong

Olaf Hartong's [sysmon-modular project](https://github.com/olafhartong/sysmon-modular/) includes several versions depending on verbosity levels. I picked the `default` configuration as a good start.

<script src="https://gist.github.com/zbalkan/ab0d44fe58e8cf9132d21dabb724b489.js"></script>

---

[^1]: Data sources in the context of MITRE ATT&CK.
[^2]: If you do not have any decoders or rules for a log you are collecting, that is useless for detection. It is better to filter them out at the source so that they do not fill up Wazuh agent buffer, consume unnecessary bandwidth and load on Wazuh manager side. Collect these logs only if you absolutely have to, for compliance reasons or regulations.
