---
title: "DNS Firewalling with MISP & Technitium DNS Server"
tags:
  - MISP
  - CTI
  - Detection
  - Technitium DNS Server
  - DNS Security
  - DNS
  - Open Source
  - Community Contribution
galleryGraph:
  - url: https://technitium.com/dns/
    image_path: /assets/dns-graph.png
galleryMispFeeds:
  - url: /assets/dns-misp-feeds.png
    image_path: /assets/dns-misp-feeds.png
galleryMispDiagram:
  - url: /assets/dns-misp-diagram.png
    image_path: /assets/dns-misp-diagram.png
galleryMispDashboard:
  - url: /assets/dns-misp-dashboard.png
    image_path: /assets/dns-misp-dashboard.png
galleryMispWazuh:
  - url: /assets/dns-misp-wazuh.png
    image_path: /assets/dns-misp-wazuh.png
galleryDig:
  - url: /assets/dns-dig.png
    image_path: /assets/dns-dig.png
galleryPyramidOfPain:
  - url: /assets/dns-pyramidofpain.png
    image_path: /assets/dns-pyramidofpain.png
galleryDnsClient:
  - url: /assets/dns-client.png
    image_path: /assets/dns-client.png
---

Technitium DNS Server started as a simple home-lab resolver but has matured into something I’d now place between AdGuard Home and AdGuard Enterprise. It remains self-hosted and lightweight but has grown into a capable platform thanks to its clustering, structured logging, and app-based extensibility. While it was never built as a Protective DNS (PDNS)[^1] service—and PDNS is typically offered as SaaS—its deterministic resolver and flexible architecture make PDNS-style filtering easy to achieve when paired with curated intelligence.

In my earlier article on [Technitium and Wazuh](https://zaferbalkan.com/technitium/), I described DNS as both a behavioral signal and an enforcement point. DNS queries appear early in the attack chain, often long before C2 traffic stabilizes. That same idea led agencies like [CISA](https://media.defense.gov/2025/Mar/24/2003675043/-1/-1/0/CSI-Selecting-a-Protective-DNS-Service-v1.3.PDF) and the [NCSC](https://www.ncsc.gov.uk/information/pdns) to define what we now call *Protective DNS (PDNS)* — resolvers that check queries against curated intelligence and block malicious domains with predictable, transparent logic. The recent improvements in Technitium make this PDNS-style model practical for self-hosted environments, though it’s not meant to replace global-scale DNS firewalls or CDN-backed resolvers such as Akamai or Cloudflare.

The term may sound new, but DNS firewalling isn’t. Paul Vixie described the idea back in 2010 in *Taking Back the DNS*, where he introduced [Response Policy Zones (RPZ)](https://web.archive.org/web/20250711145552/https://circleid.com/posts/20100728_taking_back_the_dns/) as a way for resolvers to apply reputation data. He later followed up with the [first IETF draft](https://datatracker.ietf.org/doc/html/draft-vixie-dns-rpz-00). Years later, Xavier Mertens showed a working MISP-to-RPZ workflow in his [SANS Internet Storm Center diary](https://isc.sans.edu/diary/24556), using Bind, a few shell scripts, and RPZ zone files — the same concept that inspired this article’s title. Whether we call it DNS firewalling or PDNS, the principle is well over a decade old. Technitium DNS doesn’t yet support RPZ (it’s on the roadmap), but its filtering pipeline already achieves similar results through native mechanisms.

{% include gallery id="galleryGraph" caption="Technitium DNS server has a sleek web UI that you can monitor the DNS requests" %}

## Technitium’s PDNS-Style Capabilities and What’s New in v14.2

With that background, the real question is: what makes Technitium capable of PDNS-style enforcement today? In the SaaS world, PDNS means global infrastructure, proprietary analytics, and vendor-maintained curation pipelines. Technitium isn’t trying to copy that. It’s a self-hosted resolver built for transparency and predictability — traits that fit the *architecture* of PDNS even if not the commercial model.

The recent [v14.2 update](https://github.com/TechnitiumSoftware/DnsServer/blob/master/CHANGELOG.md#version-142) introduced two changes that finally make PDNS-style filtering realistic:

* The [**MISP Connector App**](https://github.com/TechnitiumSoftware/DnsServer/tree/master/Apps/MispConnectorApp), which pulls curated threat intelligence straight from MISP.
* Updates to the [**Log Exporter App**](https://github.com/TechnitiumSoftware/DnsServer/tree/master/Apps/LogExporterApp) that add **Extended DNS Errors (EDE)** ([RFC 8914](https://datatracker.ietf.org/doc/html/rfc8914)), letting Technitium attach machine-readable block reasons — whether a domain was stopped by a local rule or MISP data.

`<humblebrag>`I wrote both the *MISP Connector* and the *Log Exporter App*`</humblebrag>` to close two long-standing gaps: enforcing curated intelligence locally and exporting DNS telemetry in a format that SIEMs can actually use.

For collecting EDE information in DNS response, the DNS query must send EDNS first. Not every client supports it, therefore you must be aware of empty `edns` fields in logs.
{: .notice--info}

{% include gallery id="galleryMispDashboard" caption="MISP provides an overview of CTI" %}

## MISP Connector App: How It Works

This article assumes familiarity with recursive resolvers and the [MISP](https://www.misp-project.org/) data model. The operating philosophy remains simple: intelligence is curated upstream in MISP, enforced deterministically at the resolver, and analyzed downstream through logs or SIEMs.

{% include gallery id="galleryMispFeeds" caption="You are expected to curate your feeds properly on MISP" %}

The MISP Connector retrieves domain indicators from MISP over its REST API. Refer to the [official documentation](https://www.circl.lu/doc/misp/automation/#automation-api) to understand MISP Automation, which you will need when generating an API key. The MISP Connector App filters the domain names in the IOCs using the `lastSeen` attribute, maintains a fast in-memory blocklist, and persists it to disk for efficient startup. Unlike older Bind RPZ workflows—which required scripts, zone rotations, and reloads—the integration is native and automatic.

A sample configuration:

```json
{
    "enableBlocking": true,
    "mispServerUrl": "https://misp.example.com",
    "mispApiKey": "YourMispApiKeyHere",
    "disableTlsValidation": false,
    "updateInterval": "2h",
    "maxIocAge": "15d",
    "allowTxtBlockingReport": true,
    "paginationLimit": 5000,
    "addExtendedDnsError": true
}
```

`maxIocAge` ensures recency, keeping enforcement aligned with active campaigns. `allowTxtBlockingReport` adds human-readable details for TXT queries. The `addExtendedDnsError` embeds structured metadata that downstream systems can interpret, which is made possible thanks to the Extended DNS Error feature of the Log Exporter App.

{% include gallery id="galleryMispDiagram" caption="MISP connects the dots in security tooling" %}

## Deterministic Enforcement in Technitium DNS

When a domain matches the MISP-derived blocklist, Technitium enforces it predictably:

* **NXDOMAIN**, for standard blocking
* Optional **TXT blocking report** with an explanatory message
* **Extended DNS Error**, indicating the precise block reason (MISP IOC or blocklist)

You can use the built-in DNS client tab for validating the capabilities. The query below will produce very detailed information for validation purposes.

{% include gallery id="galleryDnsClient" caption="DNS Client on dashboard" %}

```json
{
  "Metadata": {
    "NameServer": "lenovo (127.0.0.1)",
    "Protocol": "Udp",
    "DatagramSize": "140 bytes",
    "RoundTripTime": "0.63 ms"
  },
  "EDNS": {
    "UdpPayloadSize": 1232,
    "ExtendedRCODE": "NxDomain",
    "Version": 0,
    "Flags": "None",
    "Options": [
      {
        "Code": "EXTENDED_DNS_ERROR",
        "Length": "43 bytes",
        "Data": {
          "InfoCode": "Blocked",
          "ExtraText": "source=misp-connector;domain=stemtopx.com"
        }
      }
    ]
  },
  "Identifier": 0,
  "IsResponse": true,
  "OPCODE": "StandardQuery",
  "AuthoritativeAnswer": false,
  "Truncation": false,
  "RecursionDesired": true,
  "RecursionAvailable": true,
  "Z": 0,
  "AuthenticData": false,
  "CheckingDisabled": false,
  "RCODE": "NxDomain",
  "QDCOUNT": 1,
  "ANCOUNT": 0,
  "NSCOUNT": 1,
  "ARCOUNT": 1,
  "Question": [
    {
      "Name": "stemtopx.com",
      "Type": "A",
      "Class": "IN"
    }
  ],
  "Answer": [],
  "Authority": [
    {
      "Name": "stemtopx.com",
      "Type": "SOA",
      "Class": "IN",
      "TTL": "60 (1m)",
      "RDLENGTH": "40 bytes",
      "RDATA": {
        "PrimaryNameServer": "lenovo",
        "ResponsiblePerson": "hostadmin@lenovo",
        "Serial": 1,
        "Refresh": "14400 (4h)",
        "Retry": "3600 (1h)",
        "Expire": "604800 (1w)",
        "Minimum": "60 (1m)"
      },
      "DnssecStatus": "Disabled"
    }
  ],
  "Additional": [
    {
      "Name": "",
      "Type": "OPT",
      "Class": "1232",
      "TTL": "0 (0s)",
      "RDLENGTH": "47 bytes",
      "RDATA": {
        "Options": [
          {
            "Code": "EXTENDED_DNS_ERROR",
            "Length": "43 bytes",
            "Data": {
              "InfoCode": "Blocked",
              "ExtraText": "source=misp-connector;domain=stemtopx.com"
            }
          }
        ]
      },
      "DnssecStatus": "Disabled"
    }
  ]
}
```

You can simply use `dig` command for testing as well:

{% include gallery id="galleryDig" caption="dig command showing EDE" %}

This new set of behaviors matches the architectural core of PDNS guidance: enforcement must be deterministic, explainable, and consistent.

## Telemetry: Log Exporter and SIEM Integration

The [Log Exporter App](https://github.com/TechnitiumSoftware/DnsServer/tree/master/Apps/LogExporterApp), which I initially developed for my own SIEM integration needs, now supports JSON Lines, Syslog, and HTTP batching. With EDE included, each block event carries structured metadata. You can see that in the A record response that there is no answer, but the `edns` section includes the `{"errType":"Blocked","message":"source=misp-connector;domain=stemtopx.com"}` message. On the other hand, the TXT record query has an answer, and that answer includes the block message, regardless of EDNS.

```json
{"answers":[],"clientIp":"127.0.0.1","edns":[{"errType":"Blocked","message":"source=misp-connector;domain=stemtopx.com"}],"protocol":"Udp","question":{"questionClass":"IN","questionName":"stemtopx.com","questionType":"A"},"responseCode":"NxDomain","responseType":"Blocked","timestamp":"2025-11-26T10:10:30.567Z"}
{"answers":[{"dnssecStatus":"Unknown","name":"stemtopx.com","recordClass":"IN","recordData":"\"source=misp-connector;domain=stemtopx.com\"","recordTtl":60,"recordType":"TXT"}],"clientIp":"127.0.0.1","edns":[{"errType":"Blocked","message":"source=misp-connector;domain=stemtopx.com"}],"protocol":"Udp","question":{"questionClass":"IN","questionName":"stemtopx.com","questionType":"TXT"},"responseCode":"NoError","responseType":"Blocked","timestamp":"2025-11-26T10:35:31.168Z"}
```

This closes the loop between intelligence, enforcement, and visibility. Tools like [Wazuh](https://wazuh.com/?utm_source=ambassadors&utm_medium=referral&utm_campaign=ambassadors+program) ingest these logs to support investigations into beaconing behaviour, encoded queries, repeated block events, or unusual lookup patterns. I've already addressed the integration between [Technitium and Wazuh](https://zaferbalkan.com/technitium/), indicated as arrow 1 in the diagram. With the MISP integration, we define the arrow 2.

{% include gallery id="galleryMispWazuh" caption="MISP, TDNS and Wazuh connection" %}

## Technitium + MISP in Threat-Informed Defense

DNS activity appears early in most intrusions—before data exfiltration, payload retrieval, or a stable C2 channel forms. This makes it one of the best points to observe and disrupt attacker behavior.

MISP, in turn, curates indicators from multiple upstream sources such as CIRCL, ISACs, Abuse.ch, and organizational feeds. When a resolver enforces those indicators, it gives defenders a deterministic way to block known infrastructure before the attack chain progresses.

In David Bianco’s [Pyramid of Pain](https://detect-respond.blogspot.com/2013/03/the-pyramid-of-pain.html), domains sit on the simplest layer. They’re easy to detect and low-cost to act on—but they still carry operational value. By pairing MISP with Technitium DNS, we can reliably address that layer, closing off much of the opportunistic and commodity attack traffic that still dominates real-world telemetry.

{% include gallery id="galleryPyramidOfPain" caption="We can at least achieve the simple ones with this setup" %}

## Operational Considerations

The effectiveness of this setup depends far more on **the quality of intelligence** than on how many feeds you connect. MISP is an enabler, not a magic switch. Pulling in dozens of OSINT sources without filtering only clutters the dataset and raises false positives. Good threat intelligence is curated, scored, and contextual — it’s not a numbers game.

Use MISP’s native controls to keep it meaningful: apply confidence levels, taxonomies, and galaxy relationships. Treat enrichment and tagging as precision tools, not volume levers. A smaller, well-maintained set of indicators will outperform a massive unfiltered one in both accuracy and operational value.

Technitium’s transparency then makes that quality visible. When a block event includes an EDNS tag tied to a specific MISP attribute, you can trace exactly why a domain was blocked and decide if the source deserves trust. That clarity turns threat intelligence from an abstract feed into an auditable control point.

And as always, PDNS has limits. It protects the resolver path, not the authoritative servers. Attacks like reflection, amplification, or TCP exhaustion bypass the resolver completely. Misconfigurations such as zone-transfer leaks or DNSSEC enumeration originate on the authoritative side and remain outside PDNS scope. A protective resolver reduces noise and prevents known bad traffic, but it’s not a shield for upstream infrastructure — that still depends on sound architecture and layered defenses.

## Conclusion

Technitium DNS with MISP integration offers a simple, transparent way to bring PDNS-style prevention into a self-hosted environment. It follows the model described by CISA and NCSC — intelligence curated upstream, enforcement handled predictably in the middle, and telemetry shared downstream. It’s not meant to compete with commercial PDNS platforms; it just makes the same idea approachable for those who prefer to keep things under their own control.

This work continues what I explored in my [earlier article on Wazuh and Technitium](https://zaferbalkan.com/technitium/): DNS as both an enforcement point and an early signal. It’s a small step toward a “shift-left” mindset — preventing what we can, before we have to detect it. Adding a preventive layer at the resolver doesn’t take much effort, but it can stop problems before they ever reach your SIEM.

I’m grateful to [Shreyas Zare](https://github.com/ShreyasZare), the creator of Technitium DNS, and to everyone who contributes to the [MISP project](https://github.com/MISP/MISP/graphs/contributors). The same thanks go to those who laid the foundation: Paul Vixie for his [RPZ work](https://web.archive.org/web/20250711145552/https://circleid.com/posts/20100728_taking_back_the_dns/) and Xavier Mertens and the [SANS Internet Storm Center](https://isc.sans.edu/diary/24556) for showing how MISP could drive DNS enforcement long before this integration existed.

The *MISP Connector* and *Log Exporter Apps* are just small pieces of glue code that made sense to build and share. They’re not polished or perfect, but they close a gap I ran into, and if they help someone else, that’s reason enough. Prevention doesn’t have to be big or complex — sometimes it’s just about putting the right control in the right place, a little earlier in the chain.

---
[^1]: I am aware that PDNS is used as a short form for [PowerDNS](https://github.com/PowerDNS/pdns) as well. Here I am trying to align with CISA taxonomy.
