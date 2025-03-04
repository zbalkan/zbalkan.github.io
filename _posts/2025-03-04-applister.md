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

However, there was a problem with using `Win32_Product`. Actually, several of them: poor performance, unreliable results, unexpected side effects like triggering MSI installer repairs.

> `Win32_product` class isn't query optimized. Queries such as `select * from Win32_Product where (name like 'Sniffer%')` require WMI to use the MSI provider to enumerate all of the installed products and then parse the full list sequentially to handle the where clause. This process also starts a consistency check of packages installed, verifying, and repairing the install. An account with only user privileges may cause delay in application launch and an event 11708 stating an installation failure, as the user account may not have access to quite a few locations.
> MS Docs: [Event log message indicates that the Windows Installer reconfigured all installed applications](https://learn.microsoft.com/en-us/troubleshoot/windows-server/admin-development/windows-installer-reconfigured-all-applications)

I suggest you to check great articles like *[Win32_Product Is Evil](https://gregramsey.net/2012/02/20/win32_product-is-evil/)* or *[Please Stop Using Win32_Product To Find Installed Software](https://xkln.net/blog/please-stop-using-win32product-to-find-installed-software-alternatives-inside/)*.

So what is the alternative? If you are using Group Policy Preferences, Item Level Targeting is the recommended way. If you are using other solutions, you need yo use path control queries like `SELECT * FROM Win32_Directory WHERE Name LIKE 'C:\\Program Files\\Mozilla Firefox'`. I wanted to have a better option that does not require weird alternative paths that indicates an installation indirectly.

### What It Does

- **Step 1: App Discovery**: Built on top of [Bulk Crap Uninstaller](https://github.com/Klocman/Bulk-Crap-Uninstaller) for comprehensive scanning.
- **Step 2: Publish as WMI instances**: Exposes data through a custom WMI class (`ZB_App`), so you can query it using PowerShell or integrate it into WMI filters for Group Policy or other WMI-friendly platforms.

The data does not persist in a database or on the file system. It is kept in memory while the service is running.

### Getting Started

- **Install the Service**: I’ve packaged AppLister into an installer. Grab it, run it—done.
- **Query the Data**: Fire up PowerShell and try:

  ```powershell
  Get-CimInstance -ClassName "ZB_App"
  ```

   This spits out everything the service finds, giving you insights. Initial scan may take up to **30 seconds**. You can check Windows Event Logs: <img src="/assets/applister4.png" width="800" alt="Windows Event log">

- **Integrate**: From there, tie it into any WMI-capable tool or script—quick GPO checks, automated patch management, you name it.

You can query Windows updates.

<img src="/assets/applister1.png" width="800" alt="Query Windows updates">

Or just a single app you want:

<img src="/assets/applister2.png" width="800" alt="Query Mozilla Firefox">

Or just Windows Store apps:

<img src="/assets/applister3.png" width="800" alt="Query Windows Store Apps">

---

### Performance impact

I used this test code below to query if Mozilla Firefox is installed:

```powershell
Write-Output "WMI Class`t`tTotal Milliseconds"
Write-Output "Win32_Product`t`t`t$((Measure-Command { Get-CimInstance -Query "SELECT * FROM Win32_Product WHERE Name LIKE 'Mozilla Firefox'" }).TotalMilliseconds)"
Write-Output "Win32_Directory`t`t$((Measure-Command { Get-CimInstance -Query "SELECT * FROM Win32_Directory WHERE Name LIKE 'C:\\Program Files\\Mozilla Firefox'" }).TotalMilliseconds)"
Write-Output "ZB_App`t`t`t$((Measure-Command { Get-CimInstance -Query "SELECT * FROM ZB_App WHERE Name LIKE 'Mozilla Firefox'" }).TotalMilliseconds)"
```

And here's the result:

| WMI Class | Total Milliseconds |
|---|---:|
| Win32_Product | 19984.9615 |
| Win32_Directory | 26165.3221 |
| ZB_App | 60.8885 |

The *evil* solution returns a result in around 20 seconds. And the second alternative, the *lesser evil*, returned after 26 seconds. It will definitely slow down performance. And the last solution, returns in 60 milliseconds; over 300 times faster than `Win32_Product`, and around 430 times faster than `Win32_Directory` query. Of course, the difference stems from not initiating a scan on every query but by keeping an in-memory inventory all the time.

## Final Thoughts

If you’re looking for a simple, zero-cost way to boost your visibility into what’s installed on your Windows machines, **give AppLister a whirl**. It’s far from a one-size-fits-all solution, but it’s a step toward managing by facts instead of assumptions. After all, proper asset management is the cornerstone of robust IT and cybersecurity. Why not start with something free, lightweight, and easy to integrate? Feel free to explore, tinker, and see how it fits into your workflow.
