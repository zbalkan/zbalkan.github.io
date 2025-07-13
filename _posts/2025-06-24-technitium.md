---
title: "DNS-Level Threat Prevention and Monitoring with Wazuh and Technitium"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Technitium DNS Server
  - DNS Security
  - DNS
gallery:
  - url: /assets/dns-blocklist.png
    image_path: /assets/dns-blocklist.png
gallery1:
  - url: /assets/dns-conf.png
    image_path: /assets/dns-conf.png
gallery2:
  - url: /assets/dns-sample.png
    image_path: /assets/dns-sample.png
gallery3:
  - url: /assets/dns-dashboard.png
    image_path: /assets/dns-dashboard.png

---

In my experience, DNS is one of the most reliable and consistent indicators of intent in a network. It shows up early—before connections form, before payloads move, before anything deeper can hide in encryption. For years, I’ve seen environments try to address malicious traffic at the firewall or proxy level, often relying on IP blocklists or signature matches that act too late. DNS filtering takes a quieter, earlier approach. It’s not complicated. If a domain is known to be malicious, we stop it from resolving. That alone prevents many threats from progressing. It’s not everything, but it’s an important first step—and a good example of what people now call shift-left thinking in security: moving prevention closer to where the problem begins.

What makes DNS filtering useful isn’t just the blocking. It’s the visibility into what clients try to do—even if the traffic never gets through. Firewalls often show blocked connections, but DNS logs show the resolution attempts themselves. That’s where you learn which hosts are beaconing, or which users clicked something they shouldn’t have. These are small signals, but they matter. Whether you're using a commercial DNS firewall or something more modest like Technitium, the principles are the same: block early, watch closely, and keep the logic simple enough that you can reason about it when it matters most.

## Choosing a Resolver: RPZ, Technitium, and Logging Considerations

There are several well-established ways to enforce DNS-layer policy. One of the most widely supported mechanisms is [RPZ (Response Policy Zones)](https://dnsrpz.info/), available in BIND, Unbound, PowerDNS and many more. RPZ details are explained in the related [IETF Draft](https://datatracker.ietf.org/doc/html/draft-ietf-dnsop-dns-rpz-00). RPZ allows administrators to define custom DNS zones that override normal resolution behavior. These zones can block, redirect, or modify DNS responses based on known malicious or unwanted domains. It integrates well with curated feeds and scales to large deployments. RPZ is flexible and proven—but managing it requires zone file handling, feed syncing, and in some cases, custom response logic.

[Technitium DNS](https://technitium.com/dns/) takes a simpler but effective approach. It does not implement RPZ, but it provides a native filtering mechanism built around curated and custom blocklists. Domain filtering is enforced without the complexity of managing policy zones, and can be configured through the web interface or JSON configuration files. While less flexible than RPZ in terms of response customization, Technitium’s method is fast to deploy and operationally lightweight.

{% include gallery id="gallery" caption="DNS Blocklisting" %}

What tipped the balance for me in this case was Technitium’s **logging**. Well, technically, I built it since I loved the product. Logs were stored locally and they were easily queried on the UI but for a corporate environment, at least syslog forwarding was a must. So, I developed the [Log Exporter App](https://github.com/TechnitiumSoftware/DnsServer/pull/1056), and [Shreyas Zare](https://github.com/ShreyasZare) completed it with his attention to detail, focus on conventions and great professionalism. After this *not-so-humble* brag, I can say that Technitium DNS can log DNS events to syslog collectors, and HTTP targets like Elasticsearch if provided the payload. But I built the JSON file logging specifically for Wazuh because reading logs in JSON Lines format is such an easy solution. Yes, it is not aligning with any schema like ECS or OCSF but it is very flexible. With this capability, the resolver not only blocks domains, it also produces structured telemetry about each query: what was requested, who requested it, and what happened. That data can be consumed by Wazuh directly—without external syslog daemons, log shippers, or custom parsing. This makes the combination practical for setups that prioritize visibility and local control.

At this point, I need to specify that this is not a tutorial to teach users to install and configure Technitium DNS, therefore the assumption is user already completed their setup for integration.
{: .notice--info}

## Wazuh and Technitium DNS integration

### Log Exporter Integration

Technitium’s Log Exporter is configured either via the administrative UI or JSON file. In this setup, logs are written to a local file in JSON Lines format:

```json
{
  "maxQueueSize": 1000000,
  "file": {
    "path": "/var/log/dns/dns_logs.json",
    "enabled": true
  },
  "http": {
    "endpoint": "http://localhost:5000/logs",
    "headers": {
      "Authorization": "Bearer abc123"
    },
    "enabled": false
  },
  "syslog": {
    "address": "127.0.0.1",
    "port": 514,
    "protocol": "UDP",
    "enabled": false
  }
}
```

Each log entry is a single JSON object containing query metadata. No additional formatting or transformation is required for ingestion. You can see the sample configuration for HTTP and syslog targets easily. You can achieve similar results with syslog as well but if you have an agent on the server, why not use JSON logs?

### Wazuh Agent Configuration

The Wazuh agent reads the JSON log file directly as I have mentioned before. For this integration, it is better to use [centralized configuration](https://documentation.wazuh.com/current/user-manual/reference/centralized-configuration.html). First, we must create a new group for dns servers, and put the configuration below inside the agent.conf file. Then add your DNS servers into this group.

```xml
<localfile>
    <log_format>json</log_format>
    <only-future-events>no</only-future-events>
    <location>/var/log/dns/dns_logs.json</location>
    <out_format>{"dns": $(log) }</out_format> <!-- Wrapping the original log with a "dns" field so that the flattened log becomes `data.dns.fieldName`. -->
    <label key="type">dns</label> <!-- This is just to ensure we are collecting the correct logs. -->
</localfile>
```

The configuration above wraps each log line under a `dns` object, which keeps fields grouped and reduces collision risks. As a side note, I must remind you to set up logrotate for this log file if you have not. It is not related to Wazuh but for proper maintenance of your log file. DNS logs are noisy, causing the filesystem to run out of space easily.

But we want to log the events from Technitium itself as well. While that is out of scope *for now*, it is better to fine tune the default logging configuration. We log to the files and ignore error logs. When there is no resolution, DNS server throws an exception, and it becomes noisy. The queries, whether blocked or allowed, are logged already, so we can cut off the duplicates by ticking "Ignore Resolver Error Logs" option. Since Technitium DNS is designed to be used in containers as well, the default location of logs are in the server's config folder, `/etc/dns/`. Neither Linux nor Windows conventions are approving usage of this location as a good solution. Therefore, setting "Log Folder Path" must be one of the priorities in configuration. I set the location as `/var/log/dns/` since I am using a Linux server.

{% include gallery id="gallery1" caption="DNS Config" %}

### Custom Ruleset

The following rule group processes Technitium DNS logs. It includes classification of allowed vs. blocked traffic, pattern detection for encoded or long queries, and frequency-based anomaly detection. This can be extended with list-based IOC matching or response code logic.

```xml
<!-- Catch-all for any Technitium DNS event not matched by more-specific rules -->
<group name="technitium_dns, dns, custom">
    <rule id="100001" level="2"> <!-- Set this to level 3 to collect other logsfor debugging or troubleshooting. -->
        <decoded_as>json</decoded_as>
        <field name="dns.type">dns</field> <!-- This is just to ensure we are collecting the correct logs. -->
        <description>Technitium DNS logs grouped.</description>
    </rule>

    <rule id="100002" level="3">
        <if_sid>100001</if_sid>
        <field name="dns.responseType" negate="yes">Blocked</field>
        <description>Technitium DNS: Allowed</description>
    </rule>

    <rule id="100003" level="3">
        <if_sid>100001</if_sid>
        <field name="dns.responseType">Blocked</field>
        <description>Technitium DNS: Blocked</description>
    </rule>

    <rule id="100004" level="12" frequency="10" timeframe="30">
      <if_matched_sid>100003</if_matched_sid>
      <same_srcip/>
      <description>Technitium DNS: Multiple DNS requests blocked from same IP.</description>
    </rule>

    <rule id="100005" level="12" frequency="5" timeframe="120">
      <if_matched_sid>100002</if_matched_sid>
      <same_srcip/>
      <field name="dns.qName" type="pcre2">[\w\.]{30,}</field>
      <description>Technitium DNS: Possible exfil (multiple long queries)</description>
    </rule>

    <rule id="100006" level="12" frequency="5" timeframe="120">
      <if_matched_sid>100002</if_matched_sid>
      <same_srcip/>
      <field name="dns.qName" type="pcre2">^(?:[A-Za-z0-9+]{4})+(?:[A-Za-z0-9+]{2}==|[A-Za-z0-9+]{3}=)?$</field>
      <description>Technitium DNS: Possible exfil (base64 encoded query)</description>
    </rule>

    <rule id="100007" level="12" frequency="5" timeframe="120">
      <if_matched_sid>100002</if_matched_sid>
      <same_srcip/>
      <field name="dns.qName" type="pcre2">^(?:[A-Z2-7]{8})+(?:[A-Z2-7]{2}======|[A-Z2-7]{4}====|[A-Z2-7]{5}===|[A-Z2-7]{7}=)?$</field>
      <description>Technitium DNS: Possible exfil (base32 encoded query)</description>
    </rule>

    <rule id="100008" level="15" frequency="5" timeframe="150" ignore="60">
      <if_matched_sid>100004</if_matched_sid>
      <same_srcip/>
      <description>Technitium DNS: Multiple DNS requests blocked from same IP.</description>
      <description>The events are too high, therefore to be ignored 60 seconds to prevent issues</description>
    </rule>

    <rule id="100009" level="12">
        <if_sid>100002</if_sid>
        <list field="dns.qName" lookup="match_key">etc/lists/warning_list</list>
        <description>Technitium DNS: Malicious domain is allowed. Check blocking configuration.</description>
    </rule>
</group>
```

This ruleset isn’t comprehensive, but it’s built around patterns I’ve found meaningful in actual environments. Each rule is there for a reason: not because it fills a coverage checklist, but because it surfaces behaviors that either indicate compromise or misconfiguration —or both.

The first rule (ID: 100001) is a catch-all. It ensures that any log ingested as JSON and has the field `dns.type` -the field value is always `dns`- gets grouped and handled properly by Wazuh’s rule engine. This is useful for downstream matching and for maintaining logical separation in dashboards and alerts. The level is set to 2. If you want to build more rules on top of it, update it to level 3 to collect all the logs, so that you can have enough samples to build your rules.

Rules 100002 and 100003 split traffic into allowed and blocked categories. This separation matters because it lets us track policy outcomes, not just events. Allowed queries are often more interesting than they seem—especially if domains match known indicators but slip through due to filtering gaps. Blocked queries, on the other hand, reflect enforcement working as intended—but still need review when they come from sensitive systems or occur in volume.

{% include gallery id="gallery2" caption="Blocked request" %}

Rule 100004 looks for repeated blocked requests from the same IP over a short window. This can mean a misconfigured host, a persistent infection, or software trying to reach a hardcoded domain. It’s not always malicious, but it’s almost always noisy, and worth investigating before it clutters your logs.

The three exfiltration rules (100005–100007) are about pattern recognition. Long domain names, base64-like strings, and base32 encodings show up in DNS-based data exfiltration and tunneling. I’ve seen them used for staging payloads, session beacons, and slow data leaks. These aren’t detected by feed-based blocking alone—so we look for structure instead of exact matches.

Rule 100008 provides a temporary suppression mechanism. If rule 100004 keeps firing too rapidly from the same source, this rule suppresses repeated alerts for 60 seconds. It doesn’t silence the problem, just stops the alert from becoming its own denial-of-service.

Finally, rule 100009 checks whether allowed queries match any known IOCs from a local warning list. This is particularly useful when a feed mismatch causes a known malicious domain to slip through. Rather than relying on blocking alone, this rule highlights inconsistencies between what should have been stopped and what wasn’t. It's a safety net. But this requires you to convert your feeds to a [Wazuh CDB list](https://documentation.wazuh.com/current/user-manual/ruleset/cdb-list.html), which needs to be automated or it would be useless in time. Entropy is everywhere!

These rules are not perfect, and they are not final. But they are tuned to be useful—to catch common problems early, with context that operators can act on. In practice, it’s less about how many rules you have, and more about how confidently you can explain what each one does, and why it fires when it does.

### Dashboard

Based on existing logs, it is possible to build a custom dashboard that would be similar to Technitium DNS' own dashboard, as a start. After that, it is up to your appetite. Below you can find the dashboard I have created.

{% include gallery id="gallery3" caption="DNS Dashboard" %}

To fill in the dashboard, I created a tester application that creates DNS requests based on two lists: a benign and a malicious one. Using a statistical approach, tester simulates an environment where there is a small amount of malicious traffic to catch. In this case, I picked the top N most popular websites as benign domain list, while picked one of feeds supported by Technitium to be my malicious domain source. In the end, it was possible to populate the dashboard you have seen above.

Now, you can do more analysis, write new detection rules, start investigations on the endpoints that trigger the most alerts. It is up to your playbooks. This is only the beginning.

## Conclusion

DNS-layer blocking is a practical way to stop threats early and see what your endpoints are trying to reach. Whether that blocking is enforced via RPZ in BIND or Unbound, or via simpler native filters in Technitium, the principle is the same: deny known bad domains before resolution succeeds. What distinguishes the approach in this article is the tight connection between enforcement and telemetry. Technitium blocks and logs in one place; Wazuh parses and alerts in another. The workflow is minimal but actionable.

This is just one way to do it. The same structure—blocking, logging, and detecting—can be implemented using other DNS servers and log collectors. What matters most is not the tool itself, but its placement, clarity, and what you do with the data that comes out of it. DNS logs carry signal. Use them early, use them honestly, and write logic you trust. Everything else builds from there.
