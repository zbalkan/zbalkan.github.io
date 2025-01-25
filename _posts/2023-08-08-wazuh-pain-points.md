---
title: "Wazuh pain points"
tags:
  - Wazuh
  - SIEM
  - Detection
redirect_from: /2023/08/08/wazuh-pain-points.html
---

After I started to use Wazuh, around June 2022, I came across many [pain points](https://www.gartner.com/en/sales/glossary/pain-points). Here, I recorded and grouped some of them. There is no specific order, neither alphabetical nor by importance.

<!--more-->

## Detection Engineering

### Sigma? What is that?

Yes, there is no Sigma rule to Wazuh rule converter. Neither by Wazuh nor 3rd parties like [SOCPrime](https://uncoder.io). You need to write custom rules yourself. It's not a big deal if you want to handle a couple of them. But if you want to have a huge ruleset and translate to Wazuh rules, good luck.

## Reliability

### No local persistence of logs

The agent and manager buffers are in-memory buffers. For instance, the [agent buffers](https://github.com/wazuh/wazuh/blob/4c840d4619aedd7890cf49ebe7befd6ab631d23f/src/client-agent/buffer.c#L42) are written in C with `**char` data type, which means just an array of strings. In case of a service failure, logs in the memory are lost. When the service is restarted, it starts to process from the point the service manages to process again. So between the time of crash and service restart, **logs are lost forever**. In case of a manager failure, even though logs exist on the agent in the original format ([issue](https://github.com/wazuh/wazuh/issues/15294)), the manager is not aware of the state as well as the last log received.

### Possible loss of data in the network #1

If the network connection is lost or the server is down for any reason, agents continue to send logs. Then, the **logs are lost forever** in the network as there isn't any application-level retransmission capability ([issue](https://github.com/wazuh/wazuh/issues/15294#issuecomment-1314990091)).

For instance, [RELP](https://rainer.gerhards.net/2008/05/why-you-cant-build-reliable-tcp.html) solves this problem in Layer 4, and [Fluentd forward protocol](https://github.com/fluent/fluentd/wiki/Forward-Protocol-Specification-v1) solves it in Layer 7. Wazuh has not tried a solution yet.

### Possible loss of data in the network #2

If the `wazuh-analysisd` service is stuck for any reason, the logs are sent to the server (i.e., no free space in the filesystem). Since the port is open and listening, load-balancer allows the agents to continue sending the logs to the server, but the server cannot process them ([issue](https://github.com/wazuh/wazuh/issues/15493)). So the **logs are lost forever**.

Edit: When default log directories (`/var/ossec/logs/alerts` or `/var/ossec/logs/archives`) are removed or directory permissions are changed, the Wazuh manager fails ([issue](https://github.com/wazuh/wazuh/issues/16315)). Since the daemon fails but keeps running in an unreliable state (the default queue is inaccessible), all Wazuh manager daemons fail. Another case of the same issue.

A fail-fast approach would work better here.

A workaround I tried is using a batch script that starts on boot: it runs `tail -f /var/logs/ossec.log | grep CRITICAL` command continuously. When there is a result (at least one CRITICAL log exists), it kills the Wazuh manager service. Because there is a cluster running already, logs can be sent to other nodes, ensuring service availability.

### Reloading rules, decoders and configuration requires a restart

There is no chance to reload the daemon with a new configuration or ruleset. If you add a custom rule or modify a rule, you have to restart the cluster. If you change the `ossec.conf`, you must restart the specific `wazuh-manager` instance. And, of course, if you do a configuration change affecting the cluster, you must change the configuration on each node and restart them one by one.

The only exception is about the centralized configuration, aka `shared.conf` for agents. When you change the shared configuration, agents do not need to be restarted. The agents periodically check for `shared.conf` changes, like a group policy or any other configuration management tool. It is called Groups and it is confusing when the term Groups is also used for rules ([issue](https://github.com/wazuh/wazuh/issues/15227)).

What happens during a service restart? **Logs are lost forever**, depending on your load-balancer setup.

## Administration

### Poor clustering: no multi-master clustering capability

Clustering is possible for `wazuh-manager` service: with a manager and several [worker nodes](https://documentation.wazuh.com/current/user-manual/configuring-cluster/basics.html#types-of-nodes). The manager has the cluster config but it is static. If the manager is down, the cluster becomes unmanageable. At least, workers continue to log collection and correlation. But all administration tasks are at fault until the manager node is up again.

A multi-master setup using a distributed configuration database with RAFT algorithm to elect a new Manager in case of an incident would solve this issue. It is a "no witness" setup, so there won't be a SPOF. Considering most of `ossec.conf` and all of `shared.conf` can be stored in a database, it would make more sense. I suggested [rqlite](https://github.com/rqlite/rqlite) previously as a backend ([issue](https://github.com/wazuh/wazuh/issues/83#issuecomment-1301867401)).

### No load balancing built-in

Wazuh requires a custom TCP load balancer like Nginx or HAProxy for [load balancing and high availability setup](https://documentation.wazuh.com/current/user-manual/configuring-cluster/advanced-settings.html#pointing-agents-to-the-cluster-with-a-load-balancer).

### Poor change management

Any configuration item of Wazuh can be changed during runtime: central or shared configuration, rules, decoders, etc. There is no audit trail, and no option to rollback -except for the unsaved rules/decoders failing syntax validation. For instance, most of the firewalls and other security software provide "policies" as an abstraction of configuration changes, so that it is possible to have a chain of events as history with time, description, user, and other details (similar to `git history`). It also allows reverting the last change if things are broken for any reason. There were occasions when we needed the ability to undo the last change that broke something. It is needed to be able to see the `diff`, and also to be able to recreate a cluster, then follow the same line with that chain of events, the audit trail, so that I can get the same setup in the new cluster, aka a `reproducible` configuration.

Therefore, I suggested a similar approach with the hope that it would be considered by the architecture team in the future ([issue](https://github.com/wazuh/wazuh/issues/16529)).

### Poor agent management

Using the dashboard, it is possible to list agents and change their memberships. When it comes to removing, re-enrolling, or updating the agents, [you have to use API Console](https://documentation.wazuh.com/current/user-manual/agents/remove-agents/index.html). It is also possible to use CLI, but then the same removal commands need to be run on each `wazuh-manager` node ([issue](https://github.com/wazuh/wazuh-kibana-app/issues/4622)).

### Poor UI capabilities

It is great when an application provides an API, RESTful or not, for integrations. But when it is used to compensate for the lack of capabilities of management tools, it is a bad practice. Many tasks depend on RESTful API ([issue](https://github.com/wazuh/wazuh/issues/15227)), and not even the advanced or automated tasks.

Metaphorically speaking, for a sysadmin, tools with a UI provide basic capabilities but for advanced ones or automation, one needs to use shells and scripts. Here, with Wazuh, one has to use scripts even for basic administration.

### Poor monitoring: services and agents

If you want to monitor Wazuh agents on your critical servers or services on Wazuh servers, you need to invent your own way ([issue](https://github.com/wazuh/wazuh/issues/15215)). Kibana provides some insights but that's not much, also it's not easy to forward that data to a central monitoring solution like Zabbix, Grafana, etc. You can monitor `*.state` files for service to get the metrics. For more, you can use systemd and such.

There are options to use custom-made scripts, i.e. this [Prometheus exporter](https://github.com/pyToshka/wazuh-prometheus-exporter), which is related to the previous items.

It would be great if Wazuh provided commonly used protocols/toolsets like OpenTelemetry and Prometheus so that it would be easy to consume monitoring information. It may help to debug issues too, depending on the design.

### Poor monitoring: cluster

Whatever backend is used, OpenSearch or Elasticsearch, you are on your own for monitoring them. The cluster management and monitoring capabilities are provided for Wazuh nodes only. If you need a complete picture with your indexers, dashboard, and maybe load balancers along with the Wazuh nodes, you are on your own. You need to find your own way based on each solution using their documentation.

#### Example 1

Wazuh does not monitor filebeat on Wazuh nodes. So if the Wazuh daemons are working but the pipeline is broken and you cannot push the logs to indexers, you do not have an alert. You see that logs are not in the database when you log in to the dashboard.

For instance, if you want to disable `alerts.json` and you are okay with `alerts.log`, it turns out you break the log pipeline: the `jsonout_output` is a kill switch that [breaks the filebeat input](https://github.com/wazuh/wazuh/issues/16501). At least you have the [`recovery.py`](https://wazuh.com/blog/recover-your-data-using-wazuh-alert-backups/) to import those from `alerts.log` backups. However, a simple and undocumented configuration change should not trigger disaster recovery runbooks.

#### Example 2

Wazuh does not monitor the Wazuh Indexer. So, if there is a misconfiguration or an error, you just lose the logs and then start an investigation. Check Wazuh service logs and see if everything looks OK. Then, you hop to the next suspicious point, network and host firewalls. You see no problem. You then check your load balancer cluster and see they work just fine. Then, you check the Wazuh indexer and see that there is a problem. You check Index Management and other parts and see that shards and replicas are broken. But there is no alert, no notification. With some Google-fu, you tweak the settings and continue. You lost the logs but they are new. So, you need to update the `recovery.py` to read from current `alerts.log` by adding a `--live` parameter, instead of reading compressed backup files. It can be solved but it could have been prevented. Also, this shows that Wazuh is not a resilient system. A simple failure should not trigger DR runbooks -again.

![Wazuh when filebeat or indexer is broken](https://user-images.githubusercontent.com/39981909/228854119-0eb87958-67aa-43c8-b016-9ea78bcd0d74.jpg)
Wazuh when filebeat or indexer is broken

### Hard-coded agent naming

When an agent enrolls itself in a Wazuh server environment, it uses the `hostname` as the agent name. In big environments there may be issues with naming -naming convention has changed through time, old name still exists for legacy reasons, or sometimes it returns FQDN while other times it returns simply the device name, etc. Unfortunately, AFAIK,agent names cannot be changed at all. At least I have not discovered a way other than removing the agent, changing the agent name and re-enrolling. It is possible to hack your way into it but this is because of the design. This was not planned at the beginning.

### Agent ID issue

Agent IDs are (or should be) the unique identifiers for agents. After you remove an agent, a new agent might get an ID number that was previously used by another machine. It is possible that there is a mistake made during uninstallation and re-enrollment, and one has to query logs by `agent.id` and find the previous agent name and/or IP address.

This would not occur if GUID/UUID or ULID was used for agent identities.

### The Agent ID 000 issue

When network devices start to send syslog, it is collected by the `wazuh-manager`, then every log will be collected under Agent ID 000, even if you have dozens of different devices. This is not helpful when it comes to correlation. It would be great if Wazuh could provide virtual agent IDs per syslog source.

Just like Windows SIDs, it can be possible to have two parts: A Windows SID has a domain ID and relative ID. So that it can be guaranteed to have unique IDs per domain. For Wazuh, it can be simpler: virtual agents and real agents. Then it will be also possible to have a segregation without labeling the incoming logs. It also can provide non-conflicting IDs.

Having IDs for agentless setup also helps better management for agentless configuration.

### Disabling a ruleset

It's great to be able to use all rules by default. But it is a waste of resources if you don't need all the rules -for instance, if I don't have Fortinet and others. The only way is to remove the files from the folders. But as mentioned, this could and should be handled by the application. Ideally, the Wazuh UI should allow us to disable/unsubscribe a ruleset over UI.

### It is confusing to write decoders/rules

There are many undocumented issues if you start writing custom decoders. You cannot write decoders if some fields are pre-decoded. Which ones? Who knows?

When it comes to custom rules, the situation reappears differently. Some fields in the logs [cannot be used when writing rules](https://github.com/wazuh/wazuh-documentation/issues/5981). For instance:

- `dstuser`, `srcip`, and such are not usable as they are static values.
- `agent.*` properties
- `full_log`

The worst part is, that the decoder and syntax checkers do not validate these field names. The only way is to write the decoder or rule, restart the cluster, wait for the logs, see the absence of the rule, and then re-read the docs, and ask Google or the community.

## Security

### Lack of config file permission check

There is no check for configuration files ([issue](https://github.com/wazuh/wazuh/issues/15741)). If an admin accidentally allows `ossec.conf`, `shared.conf` to be writable by non-admin users aka others, then it is possible for an attacker to write a config to run commands under root or LOCAL SYSTEM privileges. It is a privilege escalation waiting to happen.

Have you used ssh and get this kind of error?

```plaintext
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions for 'private-key.ppk' are too open.
It is required that your private key files are NOT accessible by others.
This private key will be ignored.
Load key "private-key.ppk": bad permissions
```

These kinds of security controls are products of lessons learned.

### Lack of self auditing

User auditing on the Wazuh application itself is unfortunately very poor. It is because Wazuh depends on OpenSearch Security. It does not have an application-level IAM. The user audit is based on database capabilities. It feels like the late 90s when each Delphi-based desktop application connected directly to databases with database user credentials. One praises SOA after those.

It is possible to audit user account auditing using undocumented capabilities of OpenSearch through Kibana aka `wazuh-dashboard`. You need to enable specific logs, and then create index patterns and dashboards ([issue](https://github.com/wazuh/wazuh/issues/15039)).

However, it is not possible to create Wazuh rules and alerts on the audit data. Because the data is already "in the database". You need to write a script to query the indexer and send the results as a batch of logs to the Wazuh manager via a local pipe on a Wazuh node. That is not a scalable method as it should be done only on a single Wazuh node. If you run the script on multiple nodes, there will be duplicate alerts. And there is not a duplicate alert control on OpenSearch. You either have to accept duplicate alerts or you can say bye-bye HA -well, partially.

### Insecure admin account usage

The `admin` account is the initial administrator account in the OpenSearch Security plugin for Wazuh management. It is analogous to the `root`. However, it is also used for Wazuh nodes to send logs in bulk to `wazuh-indexer` ([issue](https://github.com/wazuh/wazuh/issues/15148)). Those services need a separate account with write permissions to specific indexes. Since this is a service account by definition, it means it should have no shell or password on the server and minimum permissions on the database.

### No integrity control for alerts

Log archiving with plain text logs generally utilizes checksums for the integrity of the old logs. It is the same with archive logs. But if you need integrity of the alerts to ensure a malicious actor cannot delete the alerts, then it is a bit complicated.

It is possible to update Wazuh alerts using the REST API. You can tamper the logs, inject data, modify fields, basically anything. Because you are connected to the database directly. It is also possible to delete. Since Wazuh uses OpenSearch for alert storage, it is possible to delete the data by bulk using a simple query like `POST /<index name>/_delete_by_query {<query>}`, just like `rm -rf /var/ossec/logs/archive` for. With the lack of proper audit logging, it is not possible to get notified that the **alerts are lost forever** or **alerts are tampered with**.

As mentioned, a malicious actor can remove or tamper alerts partially or as a whole, and we might have no idea that logs are tampered with. After a forensic analysis, it can be found later, yet it is hard to guarantee the integrity. Using index management, it is possible to set a 1 day for the hot state period and X days for the cold state before deleting, which might help tampering and deleting. But it can be cumbersome if you have a disaster scenario and you want to recover old logs. You need to first make the correct indexes writable, recover the logs, and convert back to read-only.

It is possible to utilize the immutable indices capability of OpenSearch in `wazuh-indexer` which is also an undocumented feature ([issue 1](https://github.com/wazuh/wazuh/issues/15020) and [issue 2](https://github.com/opensearch-project/documentation-website/issues/1436)). That is the best way to provide integrity. But the side effect, just like any immutable storage, is you can **never** delete anything. Consider this scenario which an application accidentally enabled debug logs and leaked PII or credit card numbers into logs. It is a low probability incident and you have to accept the risk if you use immutable indexes.

Therefore, the integrity of alerts is not guaranteed by default within Wazuh. For your DFIR, you need to save the archive logs locally somewhere and ensure integrity based on logs, not alerts.

### Lack of hardening documentation

The only hardening advice is to [change the passwords](https://documentation.wazuh.com/current/deployment-options/offline-installation.html#securing-your-wazuh-installation). Nothing for permissions, account usage, etc. It is hard to secure Wazuh after you install it.

Another hardening measure is using an agent enrollment password, yet it is not mentioned in hardening measures. It is presented as an optional feature. The risk there is when an attacker uses arbitrary packages with a fake agent, it is possible to DoS by sending logs in high volume (likelihood=high, severity=medium). The secondary risk occurs when there is a vulnerability in the Wazuh manager: an attacker can send malicious data to the vulnerable server using an unauthenticated, fake agent.

It would be great if the docs specifically mention that *the `wazuh-manager` service acts as an agent but for `wazuh-indexer`, you need to install `wazuh-agent` explicitly on the server(s)*. A warning or note on the central component installation guide, and cluster architecture would suffice.

Edit: The documentation includes a warning now.

### Hardening Wazuh daemons

Due to the variety of security mechanisms, it is hard to harden Wazuh without interrupting the workflow. Unfortunately, Wazuh does not provide methods to harden Wazuh daemons for AppArmor, SELinux, or PolKit setups. It would be great if there's documentation for `systemd-analyze security <Wazuh service name>` command results.

### No authentication & authorization for agent install-uninstall

Any user with enough privileges on the target computer, provided through either legitimate or malicious manners, can uninstall Wazuh agents on a compromised system. There is no extra step for authentication and authorization.

### Vulnerability management is a feature hard to maintain

The agent collects the inventory of installed packages and updates on the OS and checks them against the database. It is not equivalent to Nessus or OpenVAS scans. Also, since the status of the vulnerabilities is kept as logs and statistics, it is not possible to mark false positives, or accepted risks with a business justification ([issue](https://github.com/wazuh/wazuh-kibana-app/issues/4413)). After some time, the vulnerability management dashboard becomes cluttered with noise which will make it unusable.

*Edit*: *Vulnerabilities are also displayed on the Security events dashboard by default which can be distracting. I generally filter out rule 23506 when I am on the Security Events dashboard looking at level 12+ alerts.*

## Compliance

### PCI DSS compliance is bogus

The PCI DSS compliance settings of Wazuh are based on [PCI DSS v3.1](https://wazuh.slack.com/archives/C0A933R8E/p1666170922748739). The superseding version, PCI DSS v.3.2 was in force as of April 2016. Then came PCI DSS 3.2.1, and the current version: 4.0.

It means **Wazuh PCI DSS compliance features were out of use for more than 6 years**.

### Proper log archiving does not exist

The alerts are stored either in a `wazuh-indexer`, an `OpenSearch` or an `ElasticSearch` instance, along with an `alerts.log` file. All the logs collected -not the alerts- are stored on Wazuh server nodes in file `/var/ossec/logs/archive/archive.[log|json]`.

For compliance with regulations, there is no possibility to archive the alerts on the database (Wazuh Indexer, OpenSearch or ElasticSearch) ([issue](https://github.com/wazuh/wazuh-kibana-app/issues/4624)). Also, from a forensic point of view, it is better to keep the all of logs for a proper timeline of the incident, not just the alerts. It is possible to send not only the alerts but also the [archives to the indexer](https://documentation.wazuh.com/current/user-manual/manager/wazuh-archives.html#visualizing-the-events-on-the-dashboard), there is no integrity guarantee by default. It may be possible to enable immutable indices for archive logs only. But it needs to be tested.

The only proper way for archiving currently is to write alert logs locally on each `wazuh-manager` node, then move them to a network share. Even though there is a possibility of mounting an NFS share on `/var/ossec/logs/` path, it is not the best option due to network latency.

The optimal way of archiving logs is to keep them for a short time on a Wazuh server node for up to 3 days. Then, using a bash script or a synchronization tool, the compressed and signed logs can be copied to the network share. However, since each Wazuh server instance will create separate log files, there will be a separate log file per each node depending on the registered node. Because the server collecting the log for that agent can change in a cluster environment, there is no separation of data sources per archive log file. There may occur two problems for the files on a file share:

- If there is a lock on a file/folder from another node, the synchronization may fail.
- When a node copies a log to a network share, the naming includes the date. Another agent can overwrite the log files on the target because the name is the same: `ossec-archive-xx.log.gz`.

To solve both, we can create separate directories per each Wazuh server node. Even though this solves both problems, it adds a layer of complexity: an agent can change the Wazuh server node to send the logs any time in a day, and several times in the long term, logs are distributed between separate folders. If one wants the logs from the last 9 months for a device, the only solution is to run `zgrep` or better `ugrep` on all files. The is no way to consolidate the logs without breaking the built-in cryptographic signature.

What I could find is to disable Wazuh-managed compression and signing and utilize a custom workflow:

- Copy the log files to network share.
- Use a consolidation tool like [logmerge](https://github.com/microsoft/logmerge) from Microsoft, to create a separate file based on both logs.
- When successfully consolidated, remove the old log files.
- Compress and sign the merged log file.

There are more elegant solutions for this though. For instance, ArcSight uses a PostgreSQL server to collect all logs. Then with a job scheduler, it is possible to generate text logs on a file share by exporting from the database. Then, it can be compressed and signed. The prerequisite is to mount the NFS share as a local mount point on each cluster member, so the manager at the time can handle the job.

Wazuh currently allows [outputting alerts to a database](https://documentation.wazuh.com/current/user-manual/manager/manual-database-output.html) via [wazuh-dbd](https://documentation.wazuh.com/current/user-manual/reference/daemons/wazuh-dbd.html), but not archive logs. Also, it does not provide a buffer in case of a network, server, or database failure. It uses a file queue, however, [according to the code](https://github.com/wazuh/wazuh/tree/607aaa80bb42416757c2f62335cc1cc8ff2095eb/src/os_dbd), it does not implement any resiliency pattern such as retries, timeouts, circuit breakers, bulkheads, etc. If the database is not accessible for hours in case of an incident, then it will create error logs, and **the logs will be lost**. There must be an intermediate, a persistent buffer on each Wazuh node for reliability for `wazuh-dbd` too.

Can you imagine a Citus-powered distributed PostgreSQL cluster running on each Wazuh indexer server to keep archive logs, and the Wazuh manager nightly runs tasks on the cluster to export the logs to a directory, compresses, and signs them? And it is configurable via UI. What a concept!

If Wazuh could manage to solve this one, then it would be a great help.

*Edit*: *It is possible to store more logs by [setting the minimum log alert level from 3 to 1](https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/alerts.html#log-alert-level) but it does not help you when you don't have a decoder for a data source. Also, Wazuh Indexer/OpenSearch/ElasticSearch are just document databases and [do not guarantee integrity](#no-integrity-control-for-alerts).*

### Archived logs are not forensically reliable

The logs have checksum values in the same directory. However, it is easy to alter the logs, recalculate the checksums, update the checksum file, and modify `mtime`.

Therefore, for a proper archiving solution, it is better to use a cryptographically proven timestamping solution like RFC 3161 and RFC 5816, a complementary proposal, to timestamp the archived logs. I have created [an issue about it](https://github.com/wazuh/wazuh/issues/17290).

Even though it looks like a simple improvement, timestamping the logs has been a legal obligation in Turkey since 2007: If you keep DNS and internet access logs (if you are a service provider), you have to use cryptographic timestamps for the logs to be legally accepted forensic evidence. You can see it is an important point as SIEM developed in Turkey [mentions it as a feature](https://www.log-collector.com/product/5/LogCollector-LogStore).

## Integration

### Files are the universal interface

> This is the Unix philosophy: Write programs that do one thing and do it well. Write programs to work together. Write programs to handle text streams, because that is a universal interface.
> *Doug McIlroy*.

For Wazuh, files are the universal interface. If you have an application and you need to forward the logs to Wazuh, you have to store them in a file and let Wazuh read them from there. But then, you need to think about local log retention aka archival and removal. Unlike rsyslog, it is not possible to read from pipes, sockets, etc. with Wazuh agents ([issue](https://github.com/wazuh/wazuh/issues/15178)).

To make CrowdSec work with Wazuh, I needed to create a [plugin](https://github.com/zbalkan/notification-file) -incomplete yet- that writes alerts into a JSON file, so that Wazuh can consume them. It would be better if it was a pipe, socket, or even a REST API.

## Support and Community

### Community support issues

Sometimes, community support on Slack looks like a documentation search by dialogs. Yes, most end users do not read the docs and many problems are low-hanging fruits. But if one asks a complicated question, it is unsatisfactory when you get a link to docs, which generally is not the answer. I can understand that level 1 support positions do not require an IT background but many times the Slack community responses give the impression that the support people have no idea on what Wazuh does.

### No community repository/hub/store for rules and decoders

Wazuh ruleset is updated as a part of each version change. However, the ruleset is a baseline, and needs to be fine-tuned and tailored to the environment. That is why many custom decoders and rules are involved in the process. Many users around the world have their own custom rules. Some people [share their custom rules on Github](https://github.com/search?q=wazuh%20rules&type=repositories) generously. Yet, it would be better with a commonplace with a structured approach.

It would be great if Wazuh could provide a community repository for rules and decoders created by community members, just like [Zabbix](https://github.com/zabbix/community-templates).  Also, for company-tested and approved solutions, it would be another good alternative to provide a hub like [Crowdsec](https://hub.crowdsec.net/browse/) does.

*Edit*: *I Updated the article to fix typos and grammar mistakes on August 31, 2023.
