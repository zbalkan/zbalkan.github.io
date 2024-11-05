## Enhancing Wazuh Detection Capabilities with LOLRMM Sigma Rules

Since the amazing [LOLBAS](https://lolbas-project.github.io/) project, many [similar projects](https://github.com/sheimo/awesome-lolbins-and-beyond) appeared and personally I don't think some of them are actually *Living Off the Land* by definition. However, some are useful anyway.

The [LOLRMM](https://lolrmm.io/) is one of them, which allows writing prevention and detection methods for Remote Monitoring and Management (RMM) tools. First of all, please use WDAC and/or Applocker first, then write your detections. That's easier. Second, having all of the alerts would cause nothing but too much false positives. So, have a look at them and and fine tune for your environment.
<a href="https://lolrmm.io/" target="_blank"><img src="/assets/lolrmm.png" width="200" alt="LOLRMM.io"></a>

### Understanding Sigma and Wazuh

As a security professional, you most probably know [Sigma](https://github.com/SigmaHQ/sigma), the YAML-based detection format. Wazuh, on the other hand, does not have a Sigma reading capability or a well known translator. I once decided to write a Wazuh backend for [pySigma](https://github.com/SigmaHQ/pySigma), but it found its place in the stack of incompleted repositories of mine. For the very specific purpose of converting the LOLRMM's pre-built sigma rules, I crafted my own script to solve this one issue. The script is on [Github](link). It solved the issue for me and probably for you. Before using the code, I want to mention the challenges in this process, and your part when using the script.

### The Conversion Process

The task of converting Sigma rules to Wazuh rules involves several key steps:

1. **Parsing Sigma Rules:** The Python script to parse the YAML-based Sigma rules is not Sigma-specific. It just reads them as YALML files and we use it as a dictionary internally. This script extracts essential components such as detection patterns, log sources, and conditions.
2. **Mapping to Wazuh Syntax:** Translate the parsed Sigma components into Wazuh's XML-based rule syntax. This does not require an 100% understanding of both Sigma's and Wazuh's rule structures, since we are using almost a uniform sigma ruleset. Still it needs some care.
3. **Handling Special Cases:** Identify rules that require special attention, such as those necessitating File Integrity Monitoring (FIM) alerts or those lacking static Indicators of Compromise (IOCs). For instance, rules labeled as "user_managed" for Remote Monitoring and Management (RMM) tools using custom domains may not have static IOCs, so there are no Wazuh rules generated. If you need it, you need to write your rules manually with the proper domain names. Also, Wazuh uses FIM for file create/update/delete operations instead of Sysmon Event ID 11. So, the rules must be created for FIM instead.
4. **Generating Wazuh Rules:** For each successfully parsed and mapped Sigma rule, generate a corresponding Wazuh rule. Ensure that the generated rules are syntactically correct and semantically equivalent to their Sigma counterparts. For this you can see I created some mappings, many of them are unused but there just in case. Most of these require Sysmon as usual Windows Event Log channels cannot help you there.
5. **Rule ID:** Rule ID is an [abstraction leak](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/) for Wazuh. Rule IDs are not meaningful for the users. This should have been handled internally. However, until Wazuh 5.x, we must use the existing syntax. That is why I ave a variable there for the first ID of the rules. I prefer using prefixes to help me understand the rule ID and rule file name mapping. So if the custom rule file name is `5500-rmm_rules.xml`, I know that the rule IDs start from 550000. In the script if you write 100000, you wil will get `1000-rmm_rules.xml` as an output.

### Results

Out of 457 Sigma rules analyzed, approximately N were successfully converted into Wazuh-compatible rules. While most uses Sysmon event logs, some rely on FIM capability. The remaining rules were either unsuitable for direct conversion so script gives you a warning and if you need, you can write your own detections using the generated rules as examples.

## Implementation in Wazuh

To implement the converted rules in Wazuh:

1. Ensure you have Sysmon deployed on endpoints.
2. Create an endpoint group for testing. Add these lines below into your group's centralized configuration.
3. Ensure Wazuh is able to collect Sysmon logs.
4. Add your custom rule file.
5. Test it on the test computers. You don't have to actually install an RMM. Just create a file in a correct location with correct name. Or use `Invoke-WebRequest "https://cloud.acronis.com" | Out-Null` command to test the Acronis RMM rule. We don't need to check if it succeeded. We only need an application to make the request.
6. Check if the rule is triggered as expected.

### Conclusion

We tried to make use of a good project as a source. However, puting bulk detections in your environment is not a good way to improve your defenses. Use your hardening measures to block these if they are not used in your environment. It is better to consider detection as a validation for your prevention control.

<img src="/assets/wdac-wizard.png" width="600" alt="WDAC Wizard is your friend!">
