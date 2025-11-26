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
galleryPyramidOfPain:
  - url: /assets/dns-pyramidofpain.png
    image_path: /assets/dns-pyramidofpain.png
galleryDnsClient:
  - url: /assets/dns-client.png
    image_path: /assets/dns-client.png
---

Technitium DNS Server is widely known as a powerful, privacy-oriented alternative to tools such as Pi-hole and AdGuard Home. It serves homelabs, tech-savvy users, and many small and medium-sized businesses seeking transparent, self-hosted DNS filtering. With clustering, rich configuration options, structured logging, and an extensible app model, Technitium now sits somewhere between **AdGuard Home** and **AdGuard Enterprise** in terms of flexibility—still self-hosted, still simple, but increasingly capable. Although it was *not* designed as a Protective DNS (PDNS) platform—and PDNS is usually delivered as SaaS—Technitium’s deterministic resolver and extensibility make it capable of **PDNS-style prevention** when coupled with curated intelligence.

My earlier article on [Technitium and Wazuh](https://zaferbalkan.com/technitium/) described DNS as both a behavioral signal and an enforcement control. DNS queries appear early in the attack chain, often long before command-and-control channels stabilize. This recognition drove agencies such as [CISA](https://media.defense.gov/2025/Mar/24/2003675043/-1/-1/0/CSI-Selecting-a-Protective-DNS-Service-v1.3.PDF) and the [NCSC](https://www.ncsc.gov.uk/information/pdns) to formalize “Protective DNS (PDNS).” PDNS refers to resolvers that evaluate DNS queries against curated intelligence and block malicious domains with predictable logic and minimal architectural disruption. Version 14.2 of Technitium DNS, with its MISP integration, structured log export, and Extended DNS Errors, makes this PDNS-style operating model attainable in a fully self-hosted environment.

While the terminology may feel modern, DNS firewalling itself has **a history**. Paul Vixie outlined the concept of DNS reputation enforcement in 2010 in *Taking Back the DNS*, which introduced [Response Policy Zones (RPZ)](https://web.archive.org/web/20250711145552/https://circleid.com/posts/20100728_taking_back_the_dns/) as a mechanism for resolvers to apply reputation data. He later documented RPZ formally in the [first IETF draft](https://datatracker.ietf.org/doc/html/draft-vixie-dns-rpz-00). Years afterward, Xavier Mertens demonstrated a practical MISP-to-RPZ workflow in a well-known [SANS Internet Storm Center diary](https://isc.sans.edu/diary/24556), using Bind, a shell script, and RPZ zone files, which is the inspiratio for this article, hence the title. Whether we call it DNS firewalling or PDNS, the principle is more than a decade old. Technitium DNS does not yet implement RPZ—though it is on the roadmap—but its filtering pipeline delivers similar enforcement capabilities through its own native mechanisms.

{% include gallery id="galleryGraph" caption="Technitium DNS server has a sleek web UI that you can monitor the DNS requests" %}

## Technitium’s PDNS-Style Capabilities and What’s New in v14.2

PDNS in the SaaS sense provides global infrastructure, proprietary analytics, and vendor-maintained curation pipelines. Technitium does not aim to replicate that model. Instead, it offers a self-hosted resolver whose behavior is transparent and predictable—qualities that align closely with the *architectural* definition of PDNS, even if not with the commercial one.

The recent [v14.2 update](https://github.com/TechnitiumSoftware/DnsServer/blob/master/CHANGELOG.md#version-142) adds two features that make PDNS-style prevention practical:

* The [**MISP Connector App**](https://github.com/TechnitiumSoftware/DnsServer/tree/master/Apps/MispConnectorApp), which integrates curated threat intelligence directly from MISP.
* Enhancements to the [**Log Exporter App**](https://github.com/TechnitiumSoftware/DnsServer/tree/master/Apps/LogExporterApp), enabling support for **Extended DNS Errors (EDE)** ([RFC 8914](https://datatracker.ietf.org/doc/html/rfc8914)), allowing Technitium to attach machine-readable block reasons—whether the domain was blocked by a local list or through MISP intelligence.

I authored both the MISP Connector and the Log Exporter App to bridge exactly these operational gaps: self-hosted intelligence enforcement and reliable DNS observability.

{% include gallery id="galleryMispDashboard" caption="MISP provides an overview of CTI" %}

## MISP Connector App: How It Works

This article assumes familiarity with recursive resolvers and the [MISP](https://www.misp-project.org/) data model. The operating philosophy remains simple: intelligence is curated upstream in MISP, enforced deterministically at the resolver, and analyzed downstream through logs or SIEMs.

{% include gallery id="galleryMispFeeds" caption="You are expected to curate your feeds properly on MISP" %}

The MISP Connector retrieves domain indicators from MISP over its REST API. Refer to the [official documentation](https://www.circl.lu/doc/misp/automation/#automation-api) for a better understanding the MISP Automation, you need it for getting the API key. The MISP Connector App filters the domain names in the IOCs using the `lastSeen` attribute, maintains a fast in-memory blocklist, and persists it to disk for efficient startup. Unlike older Bind RPZ workflows—which required scripts, zone rotations, and reloads—the integration is native and automatic.

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

`maxIocAge` ensures recency, keeping enforcement aligned with active campaigns. `allowTxtBlockingReport` adds human-readable details for TXT queries. The `addExtendedDnsError` embeds structured metadata that downstream systems can interpret, which is made possible thanks to Extended EDNS Error feature of Log Exporter App. The rest of the configuration items are clear as well.

{% include gallery id="galleryMispDiagram" caption="MISP connects the dots in security tooling" %}

## Deterministic Enforcement in Technitium DNS

When a domain matches the MISP-derived blocklist, Technitium enforces it predictably:

* **NXDOMAIN**, for standard blocking
* Optional **TXT blocking report** with an explanatory message
* **Extended DNS Error**, indicating the precise block reason (MISP IOC or blocklist)

### Sample A record query for a blocked query

You can use the built-in client for the capabilities.

{% include gallery id="galleryDnsClient" caption="DNS Client on dashboard" %}

The query above will produce very detailed information for validation purposes.

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

This matches the architectural core of PDNS guidance: enforcement must be deterministic, explainable, and consistent.

## Telemetry: Log Exporter and SIEM Integration

The [Log Exporter App](https://github.com/TechnitiumSoftware/DnsServer/tree/master/Apps/LogExporterApp), which I initially developed for my own SIEM integration needs, now supports JSON Lines, Syslog, and HTTP batching. With EDE included, each block event carries structured metadata. You can see that in the A record response, there is no answer but the `edns` section includes the `{"errType":"Blocked","message":"source=misp-connector;domain=stemtopx.com"}` message. On the other hand, the TXT record query has an ansert and the answer includes the block message, regardless of EDNS.

```json
{"answers":[],"clientIp":"127.0.0.1","edns":[{"errType":"Blocked","message":"source=misp-connector;domain=stemtopx.com"}],"protocol":"Udp","question":{"questionClass":"IN","questionName":"stemtopx.com","questionType":"A"},"responseCode":"NxDomain","responseType":"Blocked","timestamp":"2025-11-26T10:10:30.567Z"}
{"answers":[{"dnssecStatus":"Unknown","name":"stemtopx.com","recordClass":"IN","recordData":"\"source=misp-connector;domain=stemtopx.com\"","recordTtl":60,"recordType":"TXT"}],"clientIp":"127.0.0.1","edns":[{"errType":"Blocked","message":"source=misp-connector;domain=stemtopx.com"}],"protocol":"Udp","question":{"questionClass":"IN","questionName":"stemtopx.com","questionType":"TXT"},"responseCode":"NoError","responseType":"Blocked","timestamp":"2025-11-26T10:35:31.168Z"}
```

This closes the loop between intelligence, enforcement, and visibility. Tools like [Wazuh](https://wazuh.com/?utm_source=ambassadors&utm_medium=referral&utm_campaign=ambassadors+program) ingest these logs to support investigations into beaconing behaviour, encoded queries, repeated block events, or unusual lookup patterns. I"ve already addressed the integration between [Technitium and Wazuh](https://zaferbalkan.com/technitium/), indicated as arrow 1 in the diagram. With the MISP integration, we define the arrow 2.

{% include gallery id="galleryMispWazuh" caption="MISP, TDNS and Wazuh connection" %}

## Technitium + MISP in Threat-Informed Defense

DNS traffic emerges before exfiltration attempts, malicious payload fetches, or C2 channels stabilize. MISP curates indicators from CIRCL, ISACs, Abuse.ch, and organizational sources. When the resolver enforces these indicators, defenders disrupt threats early. In David Bianco’s [Pyramid of Pain](https://detect-respond.blogspot.com/2013/03/the-pyramid-of-pain.html), domains represent a simple layer—but a layer that is inexpensive to detect and operationally meaningful.

{% include gallery id="galleryPyramidOfPain" caption="We can at least achieve the simple ones with this setup" %}

## Component Responsibilities

| Component                                              | Responsibility                                     | Characteristics                               |
| ------------------------------------------------------ | -------------------------------------------------- | --------------------------------------------- |
| **MISP (CIRCL / community / organizational instance)** | Curate, tag, contextualize, correlate, enrich IOCs | Rich semantics, human and automated workflows |
| **MISP Connector App**                                 | Fetch indicators, enforce recency filters          | Deterministic, minimal logic                  |
| **Technitium DNS Server**                              | Enforce domain blocks, serve as recursive resolver | Transparent, predictable behavior             |
| **Log Exporter with EDNS metadata**                    | Provide observability                              | Structured logs, SIEM-friendly                |
| **SIEM / NDR / XDR**                                   | Analyze, correlate, build detections               | Flexible logic, behavioural context           |

## Operational Considerations

MISP requires tuning. Importing unfiltered OSINT feeds leads to noisy blocking; using confidence levels, taxonomies, galaxies, and distribution settings ensures meaningful intelligence. Commercial PDNS vendors hide this tuning within proprietary pipelines; open-source users perform it themselves.

Technitium’s transparency makes this workflow traceable. When a block event includes an EDNS error referencing a specific MISP attribute, analysts can trace it back to the exact event and evaluate its context—clarity rarely found in proprietary PDNS ecosystems.

On the other hand, PDNS or DNS Firewalling is not a silver bullet too. Protective DNS services strengthen client-side resolution by filtering queries through threat intelligence and policy enforcement, yet they do not defend authoritative servers. Attacks such as reflection, amplification and direct denial-of-service bypass resolver paths entirely and target the authoritative IP directly. Parser-level exploits, EDNS abuse and TCP state exhaustion also occur before any Protective DNS layer can intervene. Zone-transfer leaks and DNSSEC-related enumeration remain unaffected because they originate from authoritative configuration rather than resolver filtering. Although Protective DNS can block poisoning attempts against downstream resolvers, it provides no meaningful protection for the authoritative server itself, which must rely on network filtering, hardened configuration and resilient DNS architecture.

## Conclusion

Technitium DNS with MISP integration provides a clear, controllable, self-hosted way to implement PDNS-style intelligence enforcement. It respects the architecture described by CISA and NCSC—curated intelligence upstream, deterministic enforcement midstream, and structured telemetry downstream—without claiming the scope of commercial PDNS SaaS platforms. This work continues the themes from my [earlier article on Wazuh and Technitium](https://zaferbalkan.com/technitium/): DNS as a powerful enforcement point and source of behavioural signal.

I remain grateful to the contributors who make this ecosystem possible: the creator of Technitium DNS Server, [Shreyas Zare](https://github.com/ShreyasZare), and all contributors to the [MISP project](https://github.com/MISP/MISP/graphs/contributors). And I want to acknowledge earlier pioneers—Paul Vixie, whose [RPZ work](https://web.archive.org/web/20250711145552/https://circleid.com/posts/20100728_taking_back_the_dns/) shaped DNS reputation enforcement, and Xavier Mertens and the [SANS Internet Storm Center](https://isc.sans.edu/diary/24556), who demonstrated practical MISP-based DNS firewalling long before this integration existed. My contributions—the MISP Connector and Log Exporter Apps—simply aim to build on this lineage in a modern, open-source resolver.
