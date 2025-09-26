---
title: "New release: `wazuhevtx` 1.1.0, the Wazuh event log converter"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Windows Event Log
  - Log test
  - Attack simulation
---

I have a very brief announcement.

I released a new minor version of `wazuhevtx`. Thanks to Github user Joshua T., aka [@radiantly](https://github.com/radiantly) for reporting edge cases that revealed parsing issues in more exotic EVTX files.

In this update, I chose to prioritize preventing exceptions over strict compliance with Wazuh agent behavior. This means the tool is no longer 100% identical in output, but it is more resilient and stable. The changes address cases where `EventData["Data"]` is missing -seen in VSS event logs, add explicit handling for custom event levels seen in Hello for Business logs, and improve error handling in Microsoft Time Service events.

If you are new to the tool, you can [check my article](https://zaferbalkan.com/wazuhevtx/) on what `wazuhevtx` is and how you can operationalize it. 

Download from PyPI: https://pypi.org/project/wazuhevtx/
Check the repo: https://github.com/zbalkan/wazuhevtx 
