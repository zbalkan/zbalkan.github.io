---
permalink: /projects/
title: "Projects"
---

## Personal projects

Below is a curated list of small utilities I have developed.

### Wazuh-specific utilities

| Application | Description | Language |
|---|---|---|
| [wazuh-devenv](https://github.com/zbalkan/wazuh-devenv) | The project utilizes of a wazuh-manager installed on WSL or a Linux machine, allowing testing custom rules locally before moving to production.| Python |
| [wazuh-testgen](https://github.com/zbalkan/wazuh-testgen) | A tool to help detection engineers generate Wazuh rule tests either derived from INI test files from Wazuh repository, Windows Event Log (EVTX) files, or Wazuh rule files. | Python |
| [wazuhevtx](https://github.com/zbalkan/wazuhevtx) | A Python tool that parses EVTX files and converts them into JSON formatted logs mimicking Wazuh agent behavior in version 4.x. wazuhevtx is designed as a helper for wazuh-logtest tool. | Python |
| [rulevis](https://github.com/zbalkan/rulevis) | A simple tool to visualize the Wazuh ruleset for analysis of connections. It may help finding loops, duplicates, and redundant rules. | Python |
| [sca_guide](https://github.com/zbalkan/sca_guide) | A helper for Wazuh Security Configuration Assessment (SCA) to create a custom SCA based on loosening. | Python |

### Sysadmin tools

| Application | Description | Language |
|---|---|---|
| [Applister](https://github.com/zbalkan/AppLister) | A scanner service for Windows which discovvers all installed software and publishes as WMI instances. | C# |
| [PolParser](https://github.com/zbalkan/PolParser) | A simple library to parse Registry.pol files with a working demo application. | C# |
| [eolchecker](https://github.com/zbalkan/eolchecker) | EOL Checker is a simple application which gathers EOL information for software and hardware and allows you to query locally. | Python |
| [slmgr-ps](https://github.com/zbalkan/slmgr-ps) | A drop in replacement for slmgr script, which manages Windows licenses | PowerShell |

### Security tools

| Application | Description | Language |
|---|---|---|
| [ditjson](https://github.com/zbalkan/ditjson) | ditjson is a fork of dumpntds. Unlike the original tool, the purpose it to generate JSON files in order to help integration with other tools. | C# |
| [scan_browser_extensions](https://github.com/zbalkan/scan_browser_extensions) | This proof of concept application scans extensions on Mozilla Firefox, Google Chrome and Microsoft Edge. | Python |
| [PANHunt](https://github.com/zbalkan/PANhunt) | PANhunt searches for credit card numbers (PANs) in directories. Fork of [dionach/PANhunt](https://github.com/dionach/PANhunt). Supports more file types and regardless of file extensions, ti can scan the target. | Python |
| [vmwarelog](https://github.com/zbalkan/vmwarelog) | vmwarelog is a tool to pull vmware logs based on time and type filters. It is better than collecting syslog with all of the noise. | Python |
| [ClipboardMonitor](https://github.com/zbalkan/ClipboardMonitor) | ClipboardMonitor is an application running in the background that tracks clipboard usage to detect PAN data. | C# |

### Others

| Application | Description | Language |
|---|---|---|
| [RDPKeepAlive](https://github.com/zbalkan/RDPKeepAlive) | Simulates RDP activity to keep idle RDP sessions alive with minor tweaks. Based on ImAlive. | C# |
| [yamldocs](https://github.com/zbalkan/yamldocs) | JavaDoc or doxygen for YAML  | Python |
