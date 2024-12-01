## Detecting RMM use with Wazuh

Since the amazing [LOLBAS](https://lolbas-project.github.io/) project, many [similar projects](https://lolol.farm/) have appeared -though I don't think some of them are *Living Off the Land* by definition. However, some are useful anyway. The [LOLRMM](https://lolrmm.io/) is one of the useful *LOL\** projects, and it allows writing of prevention and detection controls for Remote Monitoring and Management (RMM) tools. RMM tools have become a persistence method used by the attackers [as of 2023](https://blog.nviso.eu/2024/07/18/hunting-for-remote-management-tools/), if not earlier. These tools are necessary and legitimate tools, especially for MSPs, while they are frequently used as backdoors by attackers. This makes LOLRMM is a great resource for security teams; a handcrafted list of RMMs with their detection methods, so you don't have to.

<a href="https://lolrmm.io/" target="_blank"><img src="/assets/lolrmm.png" width="200" alt="LOLRMM.io"></a>

First of all, please use WDAC and/or Applocker first, then write your detections. Second, having all of the alerts would cause nothing but a torrent of false positives. It means you need to fine-tune for your environment.

<img src="/assets/wdac-wizard.png" width="600" alt="WDAC Wizard is your friend!">

### Understanding Sigma and Wazuh

If you are a security professional, you most probably know [Sigma](https://github.com/SigmaHQ/sigma), the YAML-based detection format. If not, I can briefly tell you that Sigma is a format for security related detections, and also the rules and tools ecosystem around it. Wazuh, the open source SIEM used by many, neither has a Sigma rule processing capability nor a well known [converter backend](https://sigmahq-pysigma.readthedocs.io/en/stable/Backends.html). I once decided to write a Wazuh backend for [pySigma](https://github.com/SigmaHQ/pySigma), but it found its place in my stack of incompleted repositories. For the very specific purpose of converting the LOLRMM's pre-built Sigma rules, I crafted a script to solve this issue. It solved the issue for me and probably for you. Before using the code, I want to mention the challenges in this process, and your part when using the script.

### The Conversion Process

The task of converting Sigma rules to Wazuh rules involves several key steps:

1. **Parsing Sigma Rules:** The Python script to parse the YAML-based Sigma rules is not Sigma-specific. It just reads them as YALML files and we use it as a dictionary internally. This script extracts essential components such as detection patterns, log sources, and conditions.
2. **Mapping to Wazuh Syntax:** Translate the parsed Sigma components into Wazuh's XML-based rule syntax. This does not require an 100% understanding of both Sigma's and Wazuh's rule structures, since we are using almost a uniform sigma ruleset. Still it needs some care. I used the Sigma docs to find the known sigma log sources for Windows to event log sources.
3. **Sysmon vs. FIM:** While many rules can be solved by just relying on Sysmon, file events are handled by File Integrity Monitoring (FIM). Therefore, we have a check that separates the Sysmon rules from FIM rules.
4. **Exceptional cases:** The exceptional cases left are those lacking static Indicators of Compromise (IOCs). The rules labeled as "user_managed" for Remote Monitoring and Management (RMM) tools using custom domains may not have static IOCs, so there are no Wazuh rules generated. If you need it, you need to write your rules manually with the proper domain names.
5. **Rule ID:** Rule ID is an [abstraction leak](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/) for Wazuh. Rule IDs are not meaningful for the users. This should have been handled internally. However, until Wazuh 5.x, we must use the existing syntax. That is why I ave a variable there for the first ID of the rules. I prefer using prefixes to help me understand the rule ID and rule file name mapping. So if the custom rule file name is `5500-rmm_rules.xml`, I know that the rule IDs start from 550000. In the script, the default value is 100000, you wil will get `1000-rmm_rules.xml` as an output.

### Generating rules

1. Clone LOLRMM repository.
2. Put the script in a location of your preference.
3. Initiate your preferred virtual environment.
4. Run the script with the proper arguments.
5. The rules are generated on the target directory.

### Script

```python
#!/usr/bin/env python3
# usage: sigma.py[-h][--sigma_directory SIGMA_DIRECTORY][--output_directory OUTPUT_DIRECTORY][--start_id START_ID]
# [--level LEVEL]
#
# Convert Sigma rules to Wazuh rules
#
# options:
#   -h, --help            show this help message and exit
#   --sigma_directory SIGMA_DIRECTORY, -i SIGMA_DIRECTORY
#   Directory containing Sigma rules
#   --output_directory OUTPUT_DIRECTORY, -o OUTPUT_DIRECTORY
#   Output directory
#   --start_id START_ID, -s START_ID
#   Starting rule ID
#   --level LEVEL, -l LEVEL

import argparse
import os
import re
import xml.etree.ElementTree as ET
from typing import Any, Optional

import yaml


class Converter:

    logsource_mapping: dict[tuple[str, str], str]

    def __init__(self) -> None:
        # logsource to Sysmon or Windows Event ID mapping
        # Reference: https://sigmahq.io/docs/basics/log-sources.html
        self.logsource_mapping = {
            # Event Log Channels
            ('windows', 'application'): 'windows_event_application',
            ('windows', 'applocker'): 'windows_event_applocker',
            ('windows', 'bits-client'): 'windows_event_bits_client',
            ('windows', 'codeintegrity-operational'): 'windows_event_codeintegrity_operational',
            ('windows', 'dns-server'): 'windows_event_dns_server',
            ('windows', 'diagnosis-scripted'): 'windows_event_diagnosis_scripted',
            ('windows', 'driver-framework'): 'windows_event_driver_framework',
            ('windows', 'firewall-as'): 'windows_event_firewall_as',
            ('windows', 'ldap_debug'): 'windows_event_ldap_debug',
            ('windows', 'microsoft-servicebus-client'): 'windows_event_servicebus_client',
            ('windows', 'msexchange-management'): 'windows_event_msexchange_management',
            ('windows', 'ntlm'): 'windows_event_ntlm',
            ('windows', 'openssh'): 'windows_event_openssh',
            ('windows', 'powershell'): 'windows_event_powershell',
            ('windows', 'powershell-classic'): 'windows_event_powershell_classic',
            ('windows', 'printservice-admin'): 'windows_event_printservice_admin',
            ('windows', 'printservice-operational'): 'windows_event_printservice_operational',
            ('windows', 'security'): 'windows_event_security',
            ('windows', 'security-mitigations'): 'windows_event_security_mitigations',
            ('windows', 'shell-core'): 'windows_event_shell_core',
            ('windows', 'smbclient-security'): 'windows_event_smbclient_security',
            ('windows', 'sysmon'): 'windows_event_sysmon',
            ('windows', 'system'): 'windows_event_system',
            ('windows', 'taskscheduler'): 'windows_event_taskscheduler',
            ('windows', 'terminalservices-localsessionmanager'): 'windows_event_terminalservices_localsessionmanager',
            ('windows', 'wmi'): 'windows_event_wmi',
            ('windows', 'windefend'): 'windows_event_windefend',

            # Sysmon Event Types
            ('windows', 'create_remote_thread'): 'sysmon_event8',
            ('windows', 'create_stream_hash'): 'sysmon_event15',
            ('windows', 'dns_query'): 'sysmon_event22',
            ('windows', 'driver_load'): 'sysmon_event6',
            ('windows', 'file_access'): 'sysmon_event10',
            ('windows', 'file_block'): 'sysmon_event27',
            ('windows', 'file_change'): 'sysmon_event26',
            ('windows', 'file_delete'): 'sysmon_event23',
            ('windows', 'file_event'): 'sysmon_event11',
            ('windows', 'file_rename'): 'sysmon_event10',
            ('windows', 'image_load'): 'sysmon_event7',
            ('windows', 'network_connection'): 'sysmon_event3',
            ('windows', 'pipe_created'): 'sysmon_event17',
            ('windows', 'process_access'): 'sysmon_event10',
            ('windows', 'process_creation'): 'sysmon_event1',
            ('windows', 'process_tampering'): 'sysmon_event25',
            ('windows', 'raw_access_thread'): 'sysmon_event9',
            ('windows', 'registry_add'): 'sysmon_event12',
            ('windows', 'registry_delete'): 'sysmon_event12',
            ('windows', 'registry_event'): 'sysmon_event12',
            ('windows', 'registry_set'): 'sysmon_event13',
            ('windows', 'wmi_event'): 'sysmon_event19',
            ('windows', 'sysmon_error'): 'sysmon_event255',
            ('windows', 'sysmon_status'): 'sysmon_event4',
        }

        # Default group
        self.logsource_mapping.setdefault(
            ('windows', ''), 'generic_event_windows')

    def add_copyright(self) -> str:
        return ("""
    The Wazuh rules below are generated from the Sigma rules of LOLRMM project.
    The Sigma rules are licensed under the Apache License, Version 2.0 by the LOLRMM project.
    The MITRE ATT&CK® framework is a registered trademark of The MITRE Corporation.
    """)

    def escape_wildcard(self, prefix: str, val: str) -> str:
        val = val.replace('*', 'PLACEHOLDER')
        val = re.escape(val)
        val = val.replace('/', r'\/')
        val = val.replace('PLACEHOLDER', '.*')
        pattern: str = f"{prefix}{val}$"
        return pattern

    # Define a function to map Sigma fields to Wazuh fields
    def sigma_to_wazuh_field(self, sigma_field: str) -> str:
        # Add the prefix and convert PascalCase to camelCase
        camel_case_field = sigma_field[0].lower() + sigma_field[1:]
        return f"win.eventdata.{camel_case_field}"

    def parse_sigma_rule(self, yaml_file: str) -> dict[str, Any]:
        sigma_rule: dict[str, Any]
        with open(yaml_file, 'r') as file:
            sigma_rule = yaml.safe_load(file)
        return sigma_rule

    def create_wazuh_rule(self, sigma_rule: dict[str, Any], rule_id: int, level: int) -> Optional[ET.Element]:
        rule = ET.Element('rule', id=str(rule_id), level=str(level))

        is_fim_rule: bool = False

        # Extract logsource information
        logsource = sigma_rule.get('logsource', {})
        product = logsource.get('product', 'generic')
        category_or_service = logsource.get('category', logsource.get('service'))

        # Check for matching logsource in mapping
        win_event_source = self.logsource_mapping.get(
            (product, category_or_service))
        if win_event_source:
            if_group = ET.SubElement(rule, 'if_group')
            if_group.text = win_event_source

        # Check for 'condition: selection' or 'condition: any'
        detection = sigma_rule.get('detection', {})
        condition = detection.get('condition', '')
        selection = detection.get('selection', {})

        # Extract the tool name from the description
        tool_name = re.search(
            r'of (.+) RMM tool', sigma_rule.get('description', 'Unnamed')).group(1)  # type: ignore

        if condition not in ('selection', 'any'):
            print(f"Warning: Rule '{tool_name}' uses an unsupported condition '{condition}'. Skipping.")
            return None  # Skip unsupported condition

        # Ignore unsupported Sysmon events
        if if_group.text in ['sysmon_event9', 'sysmon_event11', 'sysmon_event12', 'sysmon_event22', 'sysmon_event23', 'sysmon_event25', 'sysmon_event26', 'sysmon_event27']:
            is_fim_rule = True
            if_group.text = 'syscheck_file'

        # Concatenate multiple fields for OR condition
        for field, values in selection.items():

            field_name, operator = (field.split('|') + ['equals'])[:2]

            # Convert Sigma field to Wazuh field
            field_name = self.sigma_to_wazuh_field(field_name)

            # Pattern
            if operator == 'endswith':
                prefix = '.*'
            else:
                prefix = '^'

            if isinstance(values, list):
                patterns = []
                for val in values:

                    if 'user_managed' in val:
                        print(f"Warning: Rule '{tool_name}' uses a user-managed field. Skipping.")
                        return None

                    if '*' in val:
                        pattern = self.escape_wildcard(prefix, val)
                    else:
                        escaped = re.escape(val).replace('/', '\\/')
                        pattern = f"{prefix}{escaped}$"
                    # Wrap in non-capturing group
                    pattern = f"(?:{pattern})"
                    patterns.append(pattern)
                combined_pattern = '|'.join(patterns)
            else:
                if 'user_managed' in values:
                    print(f"Warning: Rule '{sigma_rule.get('title', 'Unnamed')}' uses a user-managed field. Skipping.")
                    return None
                if '*' in values:
                    combined_pattern = self.escape_wildcard(prefix, values)
                else:
                    escaped = re.escape(values).replace('/', '\\/')
                    combined_pattern = f"{prefix}{escaped}$"

        # Remove duplicate wildcards
        # Case-insensitive regex
        combined_pattern = '(?i)' + combined_pattern.replace(r'.*.*', r'.*')

        # Add the field to the rule
        if is_fim_rule:
            field_element = ET.SubElement(rule, 'field', name='name', type='pcre2')
        else:
            field_element = ET.SubElement(rule, 'field', name=field_name, type='pcre2')
        field_element.text = combined_pattern

        # Description and Info tags
        description = ET.SubElement(rule, 'description')
        description.text = sigma_rule.get('description', 'No description provided')

        info = ET.SubElement(rule, 'info', type='link')
        info.text = 'https://lolrmm.io/'  # Adding source link

        # False positives
        falsepositives = sigma_rule.get('falsepositives')
        if falsepositives is not None:
            falsepositives = '. '.join(falsepositives)
            info = ET.SubElement(rule, 'info', type='text')
            info.text = f"False positives: {falsepositives}" # Adding source link

        # Main grouping for rule and inheritance if applicable
        rule_group = ET.SubElement(rule, 'group')
        rule_group.text = f'{category_or_service or "generic"}'

        # Extract MITRE ATT&CK tags
        mitre_tags = [tag.replace('attack.', '').upper() for tag in sigma_rule.get('tags', []) if tag.startswith('attack.t')]

        # If there are any MITRE tags, add them to the rule
        if mitre_tags:
            mitre_group = ET.SubElement(rule, 'mitre')
            for tag in mitre_tags:
                ET.SubElement(mitre_group, 'id').text = tag

        return rule

    def convert(self, sigma_directory: str, output_file: str = './', start_id: int = 100000, level: int = 12) -> None:
        root_element = ET.Element('group', name='custom,windows,sysmon')

        root_element.append(ET.Comment(self.add_copyright()))
        rule_id = start_id

        total_rules = 0
        generated_rules= 0

        for root, _, files in os.walk(sigma_directory):
            for file in files:
                if file.endswith(('.yml', '.yaml')):
                    total_rules += 1
                    sigma_file_path = os.path.join(root, file)
                    sigma_rule = self.parse_sigma_rule(sigma_file_path)
                    wazuh_rule = self.create_wazuh_rule(
                        sigma_rule, rule_id, level)
                    if wazuh_rule is not None:  # Only add if conversion was successful
                        root_element.append(wazuh_rule)
                        rule_id += 1
                        generated_rules += 1

        tree = ET.ElementTree(root_element)
        ET.indent(tree, space="    ", level=0)
        tree.write(output_file, encoding='utf-8', xml_declaration=False)
        print(f"Generated {generated_rules} Wazuh rules from {total_rules} Sigma rules.")
        print(f"Check the warnings above for {total_rules - generated_rules} rules that were skipped.")

if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description='Convert Sigma rules to Wazuh rules')
    parser.add_argument('--sigma_directory','-i', type=str,dest='sigma_directory',
                        help='Directory containing Sigma rules')
    parser.add_argument('--output_directory','-o', type=str, help='Output directory', default='./')
    parser.add_argument('--start_id', '-s', type=int, default=100000,
                        help='Starting rule ID')
    parser.add_argument('--level', '-l', type=int, default=12)
    args = parser.parse_args()

    # Arguments
    sigma_directory = args.sigma_directory #'../LOLRMM/detections/sigma'
    start_id = args.start_id # 550000
    output_dir = args.output_directory # ./
    level = args.level # 12

    output_file = os.path.join(
    output_dir, f"{str(start_id)[:4]}-rmm_rules.xml")

    Converter().convert(
        sigma_directory=sigma_directory,
        output_file=output_file,
        start_id=start_id,
        level=10)

```

### Implementation in Wazuh

To implement the converted rules in Wazuh:

1. Ensure you have Sysmon deployed on endpoints.
2. Create an endpoint group for testing. Add these lines below into your group's centralized configuration.
3. Ensure Wazuh is able to collect Sysmon logs.
4. Add your custom rule file.
5. Test it on the test computers. You don't have to actually install an RMM. Just create a file in a correct location with correct name. Or use `Invoke-WebRequest "https://cloud.acronis.com" | Out-Null` command to test the Acronis RMM rule. We don't need to check if it succeeded. We only need an application to make the request.
6. Check if the rule is triggered as expected.

### Conclusion

Out of 457 Sigma rules analyzed, 418 new rules were successfully converted into Wazuh-compatible rules. The remaining rules are not suitable for conversion so the script gives you a warning. You can write your detections using the generated rules as examples if you need to.

<img src="/assets/converter-result.png" width="800" alt="WDAC Wizard is your friend!">

LOLRMM is a great resource. However, importing bulk detections in your environment is not a good way to improve your defenses. Use your hardening measures to block these if they are not used in your environment. It is better to consider detection as a validation for your prevention control.
