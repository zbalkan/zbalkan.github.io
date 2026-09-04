---
permalink: /projects/
title: "Projects"
---

Below is a curated list of small utilities I have developed. They are either under my [personal](https://github.com/zbalkan/) or [company](https://github.com/DeltaZulu-OU) repository on Github.

## Wazuh-specific utilities

| Application | Description | Language |
| --- | --- | --- |
| [wazuh-devenv](https://github.com/zbalkan/wazuh-devenv) | The project utilises of a wazuh-manager installed on WSL or a Linux machine, allowing testing custom rules locally before moving to production. | Python |
| [wazuh-testgen](https://github.com/zbalkan/wazuh-testgen) | A tool to help detection engineers generate Wazuh rule tests either derived from INI test files from Wazuh repository, Windows Event Log (EVTX) files, or Wazuh rule files. | Python |
| [wazuhevtx](https://github.com/zbalkan/wazuhevtx) | A Python tool that parses EVTX files and converts them into JSON formatted logs mimicking Wazuh agent behaviour in version 4.x. wazuhevtx is designed as a helper for wazuh-logtest tool. | Python |
| [rulevis](https://github.com/zbalkan/rulevis) | A simple tool to visualise the Wazuh ruleset for analysis of connections. It may help find loops, duplicates, and redundant rules. | Python |
| [wresult](https://github.com/zbalkan/wresult) | wresult provides the running configuration of a Wazuh agent by reconstructing how it applies ossec.conf and agent.conf. | Python |
| [wazuhscatune](https://github.com/zbalkan/wazuhscatune) | A helper for Wazuh Security Configuration Assessment (SCA) to create a custom SCA based on loosening | Python |
| [wazuhregex](https://github.com/zbalkan/wazuhregex) | wazuhregex is a Python package and command-line tool for testing expressions against the regex behavior used by Wazuh 4.x. It lets you validate one pattern against all three regex engines supported by Wazuh rules in one run | Python |

## Sysadmin tools

| Application | Description | Language |
| --- | --- | --- |
| [Applister](https://github.com/zbalkan/AppLister) | A scanner service for Windows which discovvers all installed software and publishes as WMI instances. | C# |
| [PolParser](https://github.com/zbalkan/PolParser) | A simple library to parse Registry.pol files with a working demo application. | C# |
| [eolchecker](https://github.com/zbalkan/eolchecker) | EOL Checker is a simple application which gathers EOL information for software and hardware and allows you to query locally. | Python |
| [slmgr-ps](https://github.com/zbalkan/slmgr-ps) | A drop-in replacement for slmgr script, which manages Windows licences | PowerShell |

## Security tools

| Application | Description | Language |
| --- | --- | --- |
| [dzmac](https://github.com/DeltaZulu-OU/dzmac) | DZMAC is a Windows desktop application to spoof MAC address. It is a reimplementation of Technitium MAC Address Changer (TMAC), not a reverse-engineering product, but does not aim for feature parity. | C# |
| [dznetcut](https://github.com/DeltaZulu-OU/dznetcut) | dznetcut is a Windows LAN operations tool for host discovery and authorised ARP disruption testing with both a GUI and a CLI. | C# |
| [ditjson](https://github.com/zbalkan/ditjson) | ditjson is a fork of dumpntds. Unlike the original tool, the purpose it to generate JSON files in order to help integration with other tools. | C# |
| [LogExporterApp](https://github.com/DeltaZulu-OU/LogExporterApp) | A plugin that exports DNS query logs from Technitium DNS Server to external sinks such as standard output, files, HTTP endpoints, and Syslog servers. | C# |
| [MispConnectorApp](https://github.com/DeltaZulu-OU/MispConnectorApp) | A plugin that pulls malicious domain names from MISP feeds and enforces blocking in Technitium DNS Server. | C# |
| [scan_browser_extensions](https://github.com/zbalkan/scan_browser_extensions) | This proof of concept application scans extensions on Mozilla Firefox, Google Chrome and Microsoft Edge. | Python |
| [PANHunt](https://github.com/zbalkan/PANhunt) | PANhunt searches for credit card numbers (PANs) in directories. Fork of [dionach/PANhunt](https://github.com/dionach/PANhunt). Supports more file types and regardless of file extensions, ti can scan the target. | Python |
| [vmwarelog](https://github.com/zbalkan/vmwarelog) | vmwarelog is a tool to pull vmware logs based on time and type filters. It is better than collecting syslog with all of the noise. | Python |
| [ClipboardMonitor](https://github.com/zbalkan/ClipboardMonitor) | ClipboardMonitor is an application running in the background that tracks clipboard usage to detect PAN data. | C# |
| [WinFIMLog](https://github.com/zbalkan/WinFIMLog) | WinFIMLog is a Windows service for monitoring critical directories and Registry keys. | C# |

## Others

| Application | Description | Language |
| --- | --- | --- |
| [RDPKeepAlive](https://github.com/zbalkan/RDPKeepAlive) | Simulates RDP activity to keep idle RDP sessions alive with minor tweaks. Based on ImAlive. | C# |
| [yamldocs](https://github.com/zbalkan/yamldocs) | JavaDoc or doxygen for YAML | Python |
