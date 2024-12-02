## Detect PowerShell Profile modifications

- [FIM Configuration](#fim-configuration)
- [Rules for FIM](#rules-for-fim)
- [What to expect](#what-to-expect)

This is another post targeting IT and cyber security professionals who have experience or plan to test Wazuh in a production environment. But I wanted to add explanations just in case. Otherwise, it would have been a shorter read.

[PowerShell profiles](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles?view=powershell-7.4) are customizable script files that load automatically when a PowerShell session starts. They allow users or administrators to [configure their environment](https://www.sans.org/blog/month-of-powershell-power-profile/) by defining variables, aliases, functions, or importing modules. There are different types of profiles, including those scoped for all users, specific users, or individual hosts, with paths varying by PowerShell version and operating system. In your PowerShell console, try reading the `$PROFILE` variable for your current profile (Current User, Current Host), which shows the content of `$PROFILE.CurrentUserCurrentHost`. For the other scopes, you can try `$PROFILE.CurrentUserAllHosts`, `$PROFILE.AllUsersCurrentHost`, and `$PROFILE.AllUsersAllHosts`. While useful for personalization and automation, these profiles can be an easy target as well.

PowerShell profile modification is a persistence mechanism (see [MITRE ATT&CK T1546.013](https://attack.mitre.org/techniques/T1546/013/)) that attackers use to execute code every time a PowerShell session is opened. By adding malicious code to a PowerShell profile, attackers can repeatedly run commands without re-establishing access, giving them a steady foothold in the system. I have mentioned this in my [previous post](https://zaferbalkan.com/2024/11/03/psreadline.html) very briefly, and I wanted to give an example.

This technique becomes especially risky when the compromised PowerShell session runs with administrator privileges, allowing attackers to execute commands with elevated rights across the system. Detecting these profile modifications is crucial for preventing privileged code execution that could escalate attacks or enable lateral movement.

In the next sections, we’ll look at two ways to detect these modifications in Wazuh using File Integrity Monitoring (FIM) for straightforward tracking.

### FIM Configuration

File Integrity Monitoring (FIM) is a security technology that tracks changes to files, directories, and system configurations to detect unauthorized or suspicious modifications. By comparing the current state of files against a known baseline, FIM can identify changes that may indicate malicious activity, such as tampering with critical system files, application configurations, or logs. Often used in compliance frameworks like PCI DSS and HIPAA, FIM is a vital tool for maintaining the integrity of systems, identifying potential breaches, and supporting forensic investigations in the event of an incident.

If you managed to make it to this  paragraph, you are possibly a user of Wazuh and know about the FIM capability. If it is new to you, please look at the [official documentation](https://documentation.wazuh.com/current/user-manual/capabilities/file-integrity/index.html) for how it works, how to configure and more. I want to mention that while the name focuses on change management for files, it also monitors the Windows registry because it is the equivalent of the `/etc/` folder. Change is inevitable and we need to [enable change](https://www.axelos.com/resource-hub/blog/itil_4_practitioner_change_enablement). Monitoring it is the first step, so please give it a read if you have not done so.

I suggest you use a centralized configuration for this setup. I prefer testing it with a custom endpoint group, and placing this inside the `syscheck` section. For the sake of brevity, I only added the XML tags regarding the paths. Then you can apply this to the test group and wait for `keepalive` to update the configuration but the new paths may not be checked before a full inventory scan. So, I suggest restarting the agents either locally or remotely by using DevTools and using `PUT /agents/group/<test group name>/restart`.

With the configuration below, you can enable real-time detection. I didn't use the `restrict` attribute since the detection only works with directories. Keep in mind that during scheduled FIM module scans, the real-time change detection is interrupted and then resumes as soon as the scans are finished. Therefore you need to wait for this rule to be triggered if the initial `syscheck` scan is still running.

```xml
      <!-- PowerShell 7 -->
      <directories check_all="yes" whodata="yes" realtime="yes" recursion_level="0" report_changes="yes">%SYSTEMDRIVE%\Program Files\PowerShell\7</directories>
      <directories check_all="yes" whodata="yes" realtime="yes" recursion_level="0" report_changes="yes">%SYSTEMDRIVE%\Users\*\Documents\PowerShell</directories>
      <!-- PowerShell 5.1 -->
      <directories check_all="yes" whodata="yes" realtime="yes" recursion_level="0">%WINDIR%\System32\WindowsPowerShell\v1.0</directories>
      <directories check_all="yes" whodata="yes" realtime="yes" recursion_level="0" report_changes="yes">%SYSTEMDRIVE%\Users\*\Documents\WindowsPowerShell</directories>

      <!-- Sysmon rules as binary blob in registry -->
      <windows_registry arch="both">HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\SysmonDrv\Parameters\Rules</windows_registry>
```

You can see that I added a registry setting along with the parameters. That's to allow Sysmon configuration changes to be monitored. While Sysmon has event logs to let us know about the changes, if an attacker needs to silence the Sysmon alerts, they can just modify this blob directly for stealth.

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
      <description>Suppress legitimate changes if there is an event log created within last 10 seconds.</description>
    </rule>

</group>
```

### What to expect

After configuring the rules and allowing the system to monitor changes, you should start receiving alerts in Wazuh when modifications are detected. For example:

- An alert may indicate a modification to `$PROFILE` in the scopes you have defined.
- Registry changes to Sysmon's configuration parameters will also be flagged, helping you detect potential tampering with logging mechanisms.

Now, it is up to you to refine these rules further and build more relevant detections tailored to your environment. Ensure that detected changes are investigated promptly, and legitimate updates are documented to avoid false positives.

<img src="/assets/wazuh-fim-profile.png" width="600" alt="Voila!">
