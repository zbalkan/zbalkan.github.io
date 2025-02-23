---
title: "Fine tuning Sysmon configuration for Wazuh"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Windows Event Log
  - Sysmon
---

When you want to get more visibility on wour Windows endpoints, Sysmon is the go-to utility for most. Sysadmins or security engineers try to utilize known good baselines instead of configuring manually. Generally, this baseline is either [SwiftOnSecurity](https://github.com/SwiftOnSecurity/sysmon-config) or [Olaf Hartong's work](https://github.com/olafhartong/sysmon-modular).

Sysmon is amazing with the ability it provides for visibility. You can find the [articles](https://wazuh.com/search/?s=sysmon) that make use of Sysmon with Wazuh on official blog.

## Fine tuning or tailoring

I'd like to note that if you are using Wazuh, you need some fine tuning for your environment. Justlike any SIEM, Wazuh needs tailoring to your environment. Then, you need a continuous fine tuning process duing the lifetime. But with Sysmon, we can have a sane baseline by just checking the capabilities and comparing them. That'd be a better baseline for everyone regardless of the work environment.

| Event ID | Name | Covered by Wazuh | Atomic Rule ID | Rule Group | Child rule files |
|---|---|---|---|---|---|
| 1 | Process creation || 61603 | sysmon_event1 | 0800-sysmon_id_1.xml |
| 2 | A process changed a file creation time | FIM | 61604 | sysmon_event_2 ||
| 3 | Network connection || 61605 | sysmon_event3 | 0810-sysmon_id_3.xml |
| 4 | Sysmon service state changed || 61606 | sysmon_event4 ||
| 5 | Process terminated || 61607 | sysmon_event5 ||
| 6 | Driver loaded || 61608 | sysmon_event6 ||
| 7 | Image loaded || 61609 | sysmon_event7 | 0820-sysmon_id_7.xml |
| 8 | CreateRemoteThread || 61610 | sysmon_event8 | 0870-sysmon_id_8.xml |
| 9 | RawAccessRead || 61611 | sysmon_event9 ||
| 10 | ProcessAccess || 61612 | sysmon_event_10 | 0945-sysmon_id_10.xml |
| 11 | FileCreate | FIM | 61613 | sysmon_event_11 | 0830-sysmon_id_11.xml |
| 12 | RegistryEvent (Object create and delete) | FIM | 61614 | sysmon_event_12 ||
| 13 | RegistryEvent (Value Set) | FIM | 61615 | sysmon_event_13 | 0860-sysmon_id_13.xml |
| 14 | RegistryEvent (Key and Value Rename) | FIM | 61616 | sysmon_event_14 ||
| 15 | FileCreateStreamHash || 61617 | sysmon_event_15 ||
| 16 | ServiceConfigurationChange || 61644 | sysmon_event_16 ||
| 17 | PipeEvent (Pipe Created) || 61645 | sysmon_event_17 ||
| 18 | PipeEvent (Pipe Connected) || 61646 | sysmon_event_18 ||
| 19 | WmiEvent (WmiEventFilter activity detected) || 61647 | sysmon_event_19 ||
| 20 | WmiEvent (WmiEventConsumer activity detected) || 61648 | sysmon_event_20 | 0950-sysmon_id_20.xml |
| 21 | WmiEvent (WmiEventConsumerToFilter activity detected) || 61649 | sysmon_event_21 ||
| 22 | DNSEvent (DNS query) || 61650 | sysmon_event_22 ||
| 23 | FileDelete (File Delete archived) | FIM (Wazuh does not keep the copy) | 61651 | sysmon_event_23 ||
| 24 | ClipboardChange (New content in the clipboard) || 61652 | sysmon_event_24 ||
| 25 | ProcessTampering (Process image change) || 61653 | sysmon_event_25 ||
| 26 | FileDeleteDetected (File Delete logged) | FIM | 61654 | sysmon_event_26 ||
| 27 | FileBlockExecutable |||||
| 28 | FileBlockShredding |||||
| 29 | FileExecutableDetected |||||
| 255 | Error || 61606 | sysmon_event_255 ||

You can see that most of the Sysmon event IDs have a matching Wazuh rule ID that creates a group. These definitions can be found in the initial rule file on Sysmon, `0595-win-sysmon_rules.xml`. Some newer events are not covered, so you may need custom rule if you want to benefit from them. You can find out that some rules have a better coverage with specific child rule fles, showing the significance in detection, developed by Wazuh team.

Under the circumstances, you need to follow these if you want to make the most of your setup:

- Pick your baseline
- Exclude events covered by FIM
- Either
  - Write custom rules for Sysmon events not covered by default ruleset, or
  - Exclude those events in your Sysmon configuration to minimize the load[1^].

This will give you the best of both worlds. In order to help the users, I provided modified versions of most popular sysmon configurations in gists.

Enjoy!

## Updated `sysmonconfig.xml` by SwiftOnSecurity

The [original project](https://github.com/SwiftOnSecurity/sysmon-config) has not been updated for years though it is still being used actively.

<script src="https://gist.github.com/zbalkan/8312a6d4e0a7610eccfd342e329cdaab.js"></script>

## Updated `sysmonconfig.xml` by Olaf Hartong

Olaf Hartong's [sysmon-modular project](https://github.com/olafhartong/sysmon-modular/) includes several versions depending on verbosity levels. I picked the `default` configuration as a good start.

<script src="https://gist.github.com/zbalkan/8312a6d4e0a7610eccfd342e329cdaab.js"></script>

---

[1^]: If you do not have any decoders or rules for a log you are collecting, that is useless for detection. It is better to filter them out at the source so that they do not fill up Wazuh agent buffer, consume unnecessary bandwidth and load on Wazuh manager side. Collect these logs only if you absolutely have to, for compliance reasons or regulations.
