---
title: "AppLister: A simple Windows service for installed applications"
tags:
  - Asset management
  - Configuration management
  - WMI
  - Windows
  - Utility
  - Sysadmin
---

**BLUF (Bottom Line Up Front):** Asset management is crucial for IT and cybersecurity—if you don’t know what you have, you can’t protect or manage it. The good news? You don’t need fancy, expensive solutions to get started. You can kick off your asset management journey using free tools. I built one myself—just for fun—and I’m happy to share it with anyone who wants to give it a spin.{: .notice--info}

## Introduction

Early in my IT career, I worked as a sysadmin, later became an IT manager, and at one point, transitioned into cybersecurity. Across all these roles, one lesson stands out: **you can’t manage what you can’t measure**. If you don’t know which applications, patches, or configurations are on your Windows machines, you’re flying blind. That’s why I created [AppLister](https://github.com/zbalkan/AppLister), a lightweight Windows service that collects inventory data and publishes it via WMI. It’s designed to help you get a clear picture of what’s running on your systems—without having to wrestle with clunky, built-in methods like `Win32_Product`.

### Why I Built It

- **Free & Accessible**: There are plenty of paid solutions, but I wanted something that anyone could deploy without burning a hole in their budget.

- **No More “Guesswork”**: Too many shops rely on sporadic, manual checks. AppLister automates discovery so you know for sure what’s installed.

- **Plug-and-Play with WMI**: Most enterprise and open-source tools already speak WMI. AppLister feeds them accurate, up-to-date data.

### What It Does

- **App Discovery**: Built on top of [Bulk Crap Uninstaller](https://github.com/Klocman/Bulk-Crap-Uninstaller) for comprehensive scanning.
- **Custom WMI Provider**: Exposes data through a custom WMI class (`ZB_App`), so you can query it using PowerShell or integrate it into WMI filters for Group Policy, SCCM, or other WMI-friendly platforms.
- **Extensible Architecture**: Need more than just installed apps? You can tailor AppLister to collect Windows updates, registry data, or whatever else matters to your environment.

### Getting Started

- **Install the Service**: I’ve packaged AppLister into an installer. Grab it, run it—done.
- **Query the Data**: Fire up PowerShell and try:

  ```powershell
  Get-CimInstance -ClassName "ZB_App"
  ```

   This spits out everything the service finds, giving you immediate insights.
- **Integrate**: From there, tie it into any WMI-capable tool or script—quick GPO checks, automated patch management, you name it.

You can query Windows updates.

<img src="/assets/applister1.png" width="600" alt="Query Windows updates">

Or just a single app you want:

<img src="/assets/applister2.png" width="600" alt="Query Mozilla Firefox">

Or just Windows Store apps:

<img src="/assets/applister3.png" width="600" alt="Query Windows Store Apps">
---

## Final Thoughts

If you’re looking for a simple, zero-cost way to boost your visibility into what’s installed on your Windows machines, **give AppLister a whirl**. It’s far from a one-size-fits-all solution, but it’s a step toward managing by facts instead of assumptions. After all, proper asset management is the cornerstone of robust IT and cybersecurity. Why not start with something free, lightweight, and easy to integrate? Feel free to explore, tinker, and see how it fits into your workflow.
