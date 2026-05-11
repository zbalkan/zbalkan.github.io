---
title: "Introducing DZMAC and dznetcut"
tags:
  - Windows
  - Cybersecurity
  - MAC Address
  - ARP
  - Layer 2
  - Offensive Security
  - Network Testing
  - Utility
  - Community contribution
  - Open Source
header:
  image: https://images.pexels.com/photos/2881227/pexels-photo-2881227.jpeg
  caption: "Photo credit: [Detailed view of a network switch featuring multiple ethernet ports and LED indicators](https://www.pexels.com/photo/close-up-photo-of-network-switch-2881227/) by [Brett Sayles](https://www.pexels.com/@brett-sayles/). [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/deed.en)"
---

I have been working on two small Windows tools: **DZMAC** and **dznetcut**. Both are in early release — current version is [VERSION], available at [PROJECT LINK].

They are not one product, and I do not want to force them into a single artificial category. DZMAC is for adapter identity work: inspecting, changing, randomizing, and restoring MAC addresses on Windows. dznetcut is an offensive Layer 2 testing tool: discovering hosts on a local network and running targeted ARP disruption tests.

Both live under the [DeltaZulu OÜ](https://github.com/DeltaZulu-OU) GitHub organization, which is why they use the `dz` prefix. DeltaZulu is my private company; I use it to publish FOSS tools that I intend to maintain as proper software rather than loose experiments.

The overlap is local network identity. MAC addresses are weak identifiers, but networks still use them for memory. ARP is not a security protocol, but many LANs still behave as if local Layer 2 adjacency is harmless. These are old assumptions. They are also still operationally relevant.

Both tools are Windows Forms applications with a GUI and a CLI in the same executable. That is deliberate. The GUI is for interactive work, where seeing the adapter, the current state, and the target matters. The CLI is for repeatable work, where the same operation has to be run again without clicking through the interface.

They both target .NET Framework 4.8.1. I chose that because these are Windows tools, not cross-platform frameworks, agents, dashboards, or Electron applications. The goal is small binaries and a natural Windows desktop workflow without bundling a separate modern .NET runtime. DZMAC has no packet-driver dependency. dznetcut requires Npcap because packet capture and packet injection on Windows require a packet driver. The free Npcap license allows installation on up to five systems and does not permit redistribution; deployments beyond that scope require an [Npcap OEM license](https://npcap.com/oem/).

## DZMAC

DZMAC started as a replacement for a tool I had used for years: [Technitium MAC Address Changer](https://technitium.com/tmac/), usually called TMAC.

TMAC was one of those small Windows utilities that did exactly what many of us needed. It listed adapters, showed useful network information, changed MAC addresses, restored the original address, and supported network configuration profiles. It was simple, practical, and familiar. The problem is that it has not meaningfully moved for a long time.

DZMAC is my attempt to keep that kind of workflow alive on modern Windows. It is not a reverse-engineering project and it is not trying to clone every TMAC feature. It is a focused replacement for the parts I still care about: adapter inspection, MAC address changes, randomization, restore, basic IP context, presets, and CLI support.

I do not describe it only as a MAC changer because the address itself is not the whole problem. Windows can already change MAC addresses in many cases. The awkward part is the workflow around it. You have to identify the correct adapter, avoid virtual or irrelevant interfaces, understand what the driver exposes, apply a registry-backed override, restart or re-enable the adapter, and then verify whether the live MAC actually changed. Windows exposes the primitives, but not as a coherent workflow.

Driver support is a variable, not a given. The `NetworkAddress` registry override works by asking the NIC driver to use a different address at bind time. Many drivers honor it; some do not. Certain Wi-Fi adapters — particularly some Intel AX-series and a number of USB chipsets — ignore the value entirely or apply it inconsistently. If DZMAC reports a successful change but the live MAC shown by `ipconfig /all` has not moved, the driver is the likely cause. There is no workaround short of using an adapter whose driver cooperates.

DZMAC puts the common pieces in one place. The main view shows the adapters. The detail view shows the connection name, device description, original MAC, active MAC, vendor information, link state, IPv4 and IPv6 status, gateway, DNS, and other useful context. The restore path is visible. Presets are available when the same adapter state needs to be reused.

That context matters. A MAC address is not strong identity, but it is often enough for correlation. Access points, routers, DHCP servers, captive portals, NAC systems, and logs may remember that the same local endpoint appeared before. That is why modern operating systems support MAC randomization. The address is weak as authentication, but still useful as memory.

[Windows 10 and 11 already include per-network Wi-Fi MAC randomization](https://support.microsoft.com/en-us/windows/connect-to-a-wi-fi-network-in-windows-1f881677-b569-0cd5-010d-e3cd3579d263), accessible from Settings → Network & Internet → Wi-Fi. DZMAC is not a replacement for that feature and does not conflict with it, but the two serve different purposes. The built-in option is persistent, profile-scoped, and limited to Wi-Fi. DZMAC works across adapter types — including Ethernet — and is useful when you need a specific address, a quick one-off change, a known preset, or CLI-driven automation rather than a system-managed random value.

When DZMAC generates a random address, it sets the locally administered (LAA) bit — the second-least-significant bit of the first octet — to 1. That marks the address as locally administered rather than vendor-assigned, which is the expected behavior for a generated MAC address. The practical side effect is that any system using the LAA bit as a detection signal — some NAC platforms, certain wireless controllers — will recognize the address as locally administered and may treat it differently from a hardware-burned address. That is expected behavior, not a failure.

A normal DZMAC workflow is uncomplicated. Run it as Administrator, select the adapter, review the original and active MAC values, check the current IP and gateway state, apply a generated or manual address, and verify the result. When the work is finished, restore the original address.

The GUI is the better interface when the adapter choice is not obvious. On a modern Windows machine there may be Ethernet, Wi-Fi, Bluetooth PAN, Hyper-V, VPN, WSL, security product filters, and stale interfaces. Changing the wrong adapter is easier than people admit. DZMAC defaults toward usable physical interfaces and keeps the rest available when needed.

The CLI is there when the target is already known and the action needs to be repeated. Typical examples look like this:

```powershell
DZMAC.exe -help
DZMAC.exe -n "Ethernet" -m 02-11-22-33-44-55   # apply a specific MAC address
DZMAC.exe -n "Ethernet" -r02                    # randomize with the LAA bit set (02 prefix)
DZMAC.exe -n "Ethernet" -ro                     # restore the original hardware address
DZMAC.exe -n "Ethernet" -re                     # re-enable the adapter without changing the address
````

The exact adapter name matters. If there is any doubt, I use the GUI first to confirm the connection name or device description, then move to the CLI for repeated runs.

The privacy claim should stay narrow. DZMAC can help control how a Windows adapter appears on the local network. It does not make a user anonymous. It does not hide the public IP address, browser fingerprint, account identity, VPN identity, application telemetry, or endpoint monitoring. That is not a weakness of the tool; it is just the boundary of what a MAC address is.

Presets are useful in the less glamorous cases: lab work, travel networks, troubleshooting, and repeated tests. Manually recreating adapter state is tedious and easy to get wrong. If a test depends on a known MAC, static IP, gateway, or DNS state, the state should be explicit instead of reconstructed from memory.

## dznetcut

dznetcut is different. It is a Windows offensive Layer 2 tool, and it should only be used on networks you own or have explicit written authorization to test.

It discovers local hosts and runs targeted ARP disruption sessions. I do not see value in hiding that behind softer language. The technique is ARP poisoning. The tool sends forged ARP replies so a selected target and the gateway receive incorrect IP-to-MAC mappings. The practical result is that traffic between them can be interrupted while the session is active.

The tool has two main stages: discovery and cut.

Discovery starts with adapter selection. dznetcut uses Npcap devices, maps them back to Windows network interfaces where possible, and presents usable adapters instead of forcing the operator to choose from raw capture-device names. After an adapter is selected, the scanner builds a host list for the local network. It does not rely only on one ARP sweep. It can use ARP, ICMP, passive traffic, and local discovery signals, then attaches a confidence score to discovered hosts based on how many of those methods returned a response. A host confirmed by ARP reply, ICMP echo, and passive observation scores higher than one seen in a single passive sniff. The output is deliberately operational: IP address, MAC address, gateway indication, and enough confidence information to avoid blind targeting.

The cut stage is the offensive part. The operator provides the gateway IP, gateway MAC, and one or more targets. A target is represented as an IP address and MAC address pair. During the cut session, dznetcut sends forged ARP replies to both the selected target and the gateway. Each side is told that the other side's IP address is associated with the operator machine's MAC address. Because dznetcut does not forward packets, the result is disruption rather than a MITM forwarding path. The session is bounded by duration in the CLI and can be stopped from the GUI.

The GUI workflow follows that structure. Select the active adapter, scan the local network, wait for the host list to settle, confirm the gateway and protected entries, choose the target, and start the cut. The tool is intentionally explicit about target selection because ARP disruption is not a passive operation.

The CLI is useful when the same test needs to be repeated. Start by listing adapters:

```powershell
dznetcut list-adapters
dznetcut list-adapters --json
```

Then scan through the selected adapter:

```powershell
dznetcut scan `
  --adapter "Ethernet" `
  --gateway-ip 192.168.1.1 `
  --duration 25
```

A bounded ARP disruption session looks like this:

```powershell
dznetcut cut `
  --adapter "Ethernet" `
  --gateway-ip 192.168.1.1 `
  --gateway-mac AA-BB-CC-DD-EE-FF `
  --target 192.168.1.42@11-22-33-44-55-66 `
  --duration 30
```

ARP protection is enabled by default. In this context, that means dznetcut adds a local gateway binding for the operator machine while the test is running. It protects the operator's own gateway mapping; it does not protect the entire LAN. There is also a `--no-arp-protection` option when the operator explicitly wants to disable that behavior.

A minimal lab is enough to understand the tool. Put an operator machine, a target, and a gateway on the same Layer 2 network. Run a scan, identify the target IP and MAC, identify the gateway IP and MAC, then run a short cut session. During the session, observe the target, the gateway, and any monitoring or packet capture you care about. Since dznetcut poisons both sides but does not forward traffic, the expected effect is disruption rather than transparent interception. When the duration ends or the operator stops the session, dznetcut stops sending the forged ARP replies. The poisoned entries in the target's and gateway's ARP caches will persist until they expire naturally — on Windows hosts, that transition to stale state happens between 15 and 45 seconds of inactivity — so a brief disruption tail after the session ends is expected behavior, not a bug.

Two environmental factors will limit or eliminate the tool's effect. First, managed switches with Dynamic ARP Inspection (DAI) enabled will validate ARP packets against the DHCP snooping binding table and silently drop any reply that does not match a known IP-to-MAC entry. On a network segment running DAI, dznetcut's forged replies will not reach their targets. Second, hosts with statically bound ARP entries for the gateway will not update their cache regardless of what dznetcut sends.

That is what dznetcut does. It is an offensive ARP disruption tool with host discovery, explicit target selection, bounded execution, and a Windows GUI/CLI workflow. It is useful in lab environments and authorized penetration tests on unmanaged or lightly managed Layer 2 segments. On properly hardened infrastructure, it will have no effect.

## Why I built them

I like building small tools. Not everything needs to become a product, platform, service, or company. Some tools exist because a daily problem keeps appearing, because an old workflow still matters, or because the available software has stopped moving while the need has not gone away. The same pattern shows up in many of the other projects I keep at [zaferbalkan.com/projects](https://zaferbalkan.com/projects/): PowerShell modules, sysadmin utilities, and security tools that solve specific operational problems without pretending to be larger than they are.

DZMAC and dznetcut both came from that habit. They are either forks of old software I had used, or rewrites inspired by tools that were useful in their time and then slowly became abandonware. I do not mean that as an insult to the original authors. Small utilities often solve a problem well and then age out because operating systems, drivers, dependencies, and user expectations move on. At some point, keeping the workflow alive means rebuilding it.

dznetcut came from the offensive side. Tools like NetCut made ARP disruption accessible, but I wanted a Windows implementation I could understand, maintain, and shape around explicit target selection, bounded sessions, GUI and CLI use, and cleaner host discovery. It is not trying to make ARP poisoning new. It is trying to recreate a known class of tool in a form that fits how I work now.

I build small tools because they remove friction from my own work first. If they are useful to others, good. If not, they still clarify the problem for me.
