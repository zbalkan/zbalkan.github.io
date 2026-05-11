---
title: "MISP Connector and Log Exporter Apps for Technitium DNS Server Have Moved"
tags:
  - MISP
  - CTI
  - Detection
  - Technitium DNS Server
  - DNS Security
  - DNS
  - Open Source
  - Community Contribution
---

I previously wrote about two Technitium DNS Server apps I built: the [Log Exporter App](https://zaferbalkan.com/technitium/), which exports DNS query logs for SIEM use, and the [MISP Connector App](https://zaferbalkan.com/technitium-misp/), which pulls domain indicators from MISP and uses them for resolver-side blocking.

Both started in the main Technitium DNS Server repository. That is no longer where my versions will continue.

The MISP Connector was added in Technitium DNS Server 14.2, then removed from the app store in 15.0. When I submitted a newer version, Shreyas Zare [closed the pull request](https://github.com/TechnitiumSoftware/DnsServer/pull/1598) with a straightforward explanation: it was not really feasible for him to support the app as part of the main project, and I should publish it separately on my own website and GitHub profile. That boundary made sense, so I did. The app now lives in its own repository as [MispConnectorApp](https://github.com/DeltaZulu-OU/MispConnectorApp).

The standalone version is not only a relocated copy of the original app. The upstream version had a bug that caused blocked responses to carry empty Extended DNS Error and TXT report strings, so the blocking worked but the explanation disappeared. The newer version fixes that and adds a configurable TTL for blocking answers. It still follows the same model I described in the earlier article: it retrieves domain indicators from MISP over the REST API, handles paginated fetches with retries for transient failures, keeps a fast in-memory blocklist with a disk-backed cache for startup, matches both exact domains and parent domains, and can return either `NXDOMAIN`, a TXT blocking report, or the same report as EDE metadata when the query includes EDNS. It also keeps configurable refresh intervals and IOC age windows, because a blocklist fed from CTI is only as useful as the recency discipline behind it. ([PR discussion](https://github.com/TechnitiumSoftware/DnsServer/pull/1598), [repository](https://github.com/DeltaZulu-OU/MispConnectorApp))

The Log Exporter App reached a similar point for a different reason. My newer version was no longer a small extension of the app covered in the [older Wazuh article](https://zaferbalkan.com/technitium/). It had become a larger redesign. I converted it from a simple exporter into a proper log forwarder with a bounded asynchronous pipeline, optional enrichment stages, additional sink options, and a different configuration model. The changes included responding nameserver metadata for clustered deployments, Public Suffix List-based domain normalization, static tag injection for downstream routing, console output for containers or debugging, and newline-delimited JSON for HTTP export. The last one came from a concrete user request: the existing HTTP payload format was awkward for cloud logging systems and duplicated data unnecessarily, as discussed in [issue #1381](https://github.com/TechnitiumSoftware/DnsServer/issues/1381). ([PR discussion](https://github.com/TechnitiumSoftware/DnsServer/pull/1580))

That was exactly why it should not have been merged as-is into the bundled app. Shreyas pointed out in the [pull request discussion](https://github.com/TechnitiumSoftware/DnsServer/pull/1580) that the rewrite was not backward compatible and that the existing app was already deployed widely enough for an immediate break to matter. Keeping the upstream version stable made sense for the main project. I continued the newer version separately, and it now lives as [LogExporterApp](https://github.com/DeltaZulu-OU/LogExporterApp).

The standalone Log Exporter continues the original purpose, but the shape of the app is different now. It captures DNS queries and responses through Technitium's query logger interface, passes them through a two-stage bounded pipeline, optionally enriches them before export, and sends them to console, file, HTTP, or Syslog sinks. It can include EDE data, emit NDJSON over HTTP, derive domain structure through the Public Suffix List, add static tags for routing or tenant identification, report dropped records when the pipeline is full, and drain pending logs during shutdown. Those details matter once DNS telemetry becomes part of an operational workflow. The question stops being whether logs can leave the resolver and becomes whether they leave it predictably, remain useful downstream, and fail in ways you can reason about. ([repository](https://github.com/DeltaZulu-OU/LogExporterApp))

The older articles remain useful. The [first one](https://zaferbalkan.com/technitium/) explains why I wanted structured DNS telemetry in the first place and how the original Log Exporter fit into a Wazuh workflow. The [second one](https://zaferbalkan.com/technitium-misp/) describes the MISP integration and the broader design: intelligence curated upstream, deterministic enforcement at the resolver, and telemetry exported downstream. None of that reasoning has changed. What changed is where these implementations are maintained, and how far my versions have moved from the original upstream apps.

This is not an unusual outcome in open source. A feature can be useful and still fall outside what an upstream maintainer is willing to support long-term. A rewrite can be technically worthwhile and still be the wrong change for an installed user base. In both cases, separating the work is cleaner than forcing the main project to absorb support cost or migration risk it did not ask for.

From here, these versions will develop outside the Technitium DNS Server tree. The MISP Connector will remain focused on bringing curated domain intelligence into the resolver. The newer Log Exporter will remain focused on producing DNS telemetry that is easier to route, enrich, and consume without turning the resolver itself into an observability project.

The apps are separate now, but the reason they exist is the same as before: there was a gap I wanted to close, and the simplest durable way to close it was to build the missing piece.
