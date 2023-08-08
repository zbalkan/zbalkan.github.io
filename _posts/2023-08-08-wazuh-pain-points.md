## Wazuh pain points

After I started to use Wazuh, around June 2022, I came across many [pain points](https://www.gartner.com/en/sales/glossary/pain-points). Here, I recorded and grouped some of them together. There is no specific order, neither alphabetical nor by importance.

### Table of Contents
  * [Detection Engineering](#detection-engineering)
    + [Sigma? What is that?](#sigma-what-is-that)
  * [Reliability](#reliability)
    + [No local persistence of logs](#no-local-persistence-of-logs)
    + [Possible loss of data in the network #1](#possible-loss-of-data-in-the-network-1)
    + [Possible loss of data in the network #2](#possible-loss-of-data-in-the-network-2)
    + [Reloading rules, decoders and configuration requires restart](#reloading-rules-decoders-and-configuration-requires-restart)
  * [Administration](#administration)
    + [Poor clustering: no multi-master clustering capability](#poor-clustering-no-multi-master-clustering-capability)
    + [No load balancing built-in](#no-load-balancing-built-in)
    + [Poor change management](#poor-change-management)
    + [Poor agent management](#poor-agent-management)
    + [Poor UI capabilities](#poor-ui-capabilities)
    + [Poor monitoring: services and agents](#poor-monitoring-services-and-agents)
    + [Poor monitoring: cluster](#poor-monitoring-cluster)
    + [Hard-coded agent naming](#hard-coded-agent-naming)
    + [Agent ID issue](#agent-id-issue)
    + [The Agent ID 000 issue](#the-agent-id-000-issue)
    + [Disabling a ruleset](#disabling-a-ruleset)
    + [It is confusing to write decoders/rules](#it-is-confusing-to-write-decodersrules)
  * [Security](#security)
    + [Lack of config file permission check](#lack-of-config-file-permission-check)
    + [Lack of self auditing](#lack-of-self-auditing)
    + [Insecure admin account usage](#insecure-admin-account-usage)
    + [No integrity control for alerts](#no-integrity-control-for-alerts)
    + [Lack of hardening documentation](#lack-of-hardening-documentation)
    + [Hardening Wazuh daemons](#hardening-wazuh-daemons)
    + [No authentication & authorization for agent install-uninstall](#no-authentication--authorization-for-agent-install-uninstall)
    + [Vulnerability management is a feature hard to maintain](#vulnerability-management-is-a-feature-hard-to-maintain)
  * [Compliance](#compliance)
    + [PCI DSS compliance is bogus](#pci-dss-compliance-is-bogus)
    + [Proper log archiving does not exist](#proper-log-archiving-does-not-exist)
    + [Archived logs are not forensically reliable](#archived-logs-are-not-forensically-reliable)
  * [Integration](#integration)
    + [Files are the universal interface](#files-are-the-universal-interface)
  * [Support and Community](#support-and-community)
    + [Community support issues](#community-support-issues)
    + [No community repository/hub/store for rules and decoders](#no-community-repositoryhubstore-for-rules-and-decoders)

### Detection Engineering

#### Sigma? What is that?

Yes, there is no Sigma rule to Wazuh converter. Neither by Wazuh nor 3rd parties like [SOCPrime](https://uncoder.io). You need to write custom rules yourself. It's not a big deal if you want to handle a couple of them. But if you want to have a huge ruleset and translate to Wazuh rules, good luck.

### Reliability 

#### No local persistence of logs

The agent and manager buffers are in-memory buffers. The buffers are written in C as `**char` data type, which means just an array of strings. In case of a service failure, logs in the memory are lost. When the service is restarted, it starts to process from the point the service manages to process again. So between the time of crash and service restart, **logs are lost forever**. In case of a manager failure, even though logs exist on the agent in the original format (https://github.com/wazuh/wazuh/issues/15294), manager is not aware of the state, and the last log received.

#### Possible loss of data in the network #1

If network connection is lost or server is down for any reason, agents continue to send logs. Then, the **logs are lost forever** in network as there is not an application level retransmission capability (https://github.com/wazuh/wazuh/issues/15294#issuecomment-1314990091).

[RELP](https://rainer.gerhards.net/2008/05/why-you-cant-build-reliable-tcp.html) solves this problem on Layer 4, and [Fluentd forward protocol](https://github.com/fluent/fluentd/wiki/Forward-Protocol-Specification-v1) solves on Layer 7.

#### Possible loss of data in the network #2

If the `wazuh-analysisd` service is stuck for any reason, the logs are sent to the server (i.e., no free space in filesystem). Since the port is open and listening, load-balancer allows the agents continue sending the logs to the server, but the server cannot process them (https://github.com/wazuh/wazuh/issues/15493). So the **logs are lost forever**.

Edit: When default log directories (`/var/ossec/logs/alerts` or `/var/ossec/logs/archives`) are removed or directory permissions are changed, Wazuh manager fails (https://github.com/wazuh/wazuh/issues/16315). Since the daemon fails but keeps running in an unreliable state (the default queue is inaccessible, so all Wazuh manager daemons fail). Another case of the same issue.

A fail-fast approach would work better here. 

A workaround I tried it a batch script starts on boot, does a `tail -f /var/logs/ossec.log | grep CRITICAL`. When there is a result, it kills the Wazuh manager service. Because there is a cluster already, logs can be sent to other nodes, ensuring service availability. 

#### Reloading rules, decoders and configuration requires restart

There is not a chance to reload the daemon with new configuration or ruleset. If you add a custom rule or modify a rule, you have to restart the cluster. If you change the `ossec.conf`, you must restart the specific `wazuh-manager` instance. And, of course, if you do a configuration change affecting the cluster, you must change the setting on each node and restart them one by one.

The only exception is about the centralized configuration, aka `shared.conf` for agents. When you change the shared configuration, agents do not need to be restarted. The agents periodically check for `shared.conf` changes, like a group policy or any other configuration management tool. It is called Groups and it is confusing when the term Groups is also used for rules (https://github.com/wazuh/wazuh/issues/15227).

What happens during a service restart? **Logs are lost forever**, depending on your load-balancer setup.

### Administration

#### Poor clustering: no multi-master clustering capability

Clustering is possible for `wazuh-manager` service: with a manager and several worker nodes (https://documentation.wazuh.com/current/user-manual/configuring-cluster/basics.html#types-of-nodes). Manager has the cluster config but it is static. If manager is down, cluster is unmanageable. At least, workers continue to log collection and correlation. But all administration tasks are at fault until the manager node is up again.

A multi-master setup using a distributed configuration database with RAFT algorithm to elect a new Manager in case of an incident would solve this issue. It is a "no witness" setup, so there won't be a SPOF. Considering most of `ossec.conf` and all of `shared.conf` can be stored in a database, it would make more sense. I suggested [rqlite](https://github.com/rqlite/rqlite) previously as a backend (https://github.com/wazuh/wazuh/issues/83#issuecomment-1301867401).

#### No load balancing built-in

Wazuh requires a custom TCP load-balancer like Nginx or HAProxy for load balancing and high availability setup (https://documentation.wazuh.com/current/user-manual/configuring-cluster/advanced-settings.html#pointing-agents-to-the-cluster-with-a-load-balancer).

#### Poor change management

Any configuration item of Wazuh can be changed during runtime: central or shared configuration, rules, decoders, etc. There is no audit trail, no option to rollback -except for the unsaved rules/decoders failing syntax validation. For instance many firewalls and other security software provide "policies" as an abstraction of configuration changes, so that it is possible to have a chain of events as history with time, description, user and other details (similar to `git history`). It also allows reverting the last change if things are broken for any reason. There were occasions where we needed the ability to undo last change that breaks something. It is needed to be able to see the `diff`, and also to be able to recreate a cluster, then follow the same line with that chain of events, the audit trail, so that I can get the same setup in the new cluster, aka a `reproducible` configuration.

Therefore, I suggested a similar approach with the hope that it would be considered by the architecture team in the future (https://github.com/wazuh/wazuh/issues/16529). 

#### Poor agent management

Using the dashboard, it is possible to list agents and change their memberships. When it comes to removing, re-enrolling, or updating the agents you have to use API Console (https://documentation.wazuh.com/current/user-manual/agents/remove-agents/index.html). It is also possible to use CLI, but then the same removal commands need to be run on each `wazuh-manager` node (https://github.com/wazuh/wazuh-kibana-app/issues/4622).

#### Poor UI capabilities

It is great when an application provides an API, RESTful or not, for integrations. But when it is used to compensate the lack of capabilities of management tools, it is a bad practice. Many tasks depend on RESTful API (https://github.com/wazuh/wazuh/issues/15227), and not even the advanced or automated tasks.

Metaphorically speaking, for a sysadmin, tools with a UI provide basic capabilities but for advanced ones or automation, one needs to use shells and scripts. Here, with Wazuh, one has to use scripts even for basic administration.

#### Poor monitoring: services and agents

If you want to monitor Wazuh agents on your critical servers or services on Wazuh servers, you need to invent your own way (https://github.com/wazuh/wazuh/issues/15215). Kibana provides some insights but that's not much, also it's not easy to forward that data to a central monitoring solution like Zabbix, Grafana, etc. You can monitor `*.state` files for service to get the metrics. For more, you can use systemd and such.

There are options to use custom made scripts (https://github.com/pyToshka/wazuh-prometheus-exporter), which is related to the previous items.

It would be great if Wazuh provided commonly used protocols/toolset like OpenTelemetry and Prometheus, so that it would be easy to consume monitoring information. It may help to debug issues too, depending on the design.

#### Poor monitoring: cluster

Whatever backend is used, OpenSearch or Elasticsearch, you are on your own for monitoring them. The cluster management and monitoring capabilities are provided for Wazuh nodes only. If you need a complete picture with your indexers, dashboard, maybe load balancers along with the Wazuh nodes, you are on your own. You need to find your own way based on each solution using their own documentation.

##### Example 1

Wazuh does not monitor filebeat on Wazuh nodes. So if the Wauh daemons are working but the pipeline is broken and you cannot push the logs to indexers, you do not have an alert. You see that logs are not in the database when you log in to the dashboard.

For instance, if you want to disable `alerts.json` and you are ok with `alerts.log`, it turns out you break the log pipeline: the `jsonout_output` is a killswitch which [breaks the filebeat input](https://github.com/wazuh/wazuh/issues/16501). At least you have the [`recovery.py`](https://wazuh.com/blog/recover-your-data-using-wazuh-alert-backups/) to import those from `alerts.log` backups. But a simple and undocumented configuration change should not trigger disaster recovery runbooks.

##### Example 2

Wazuh does not monitor Wazuh Indexer. So, if there is a misconfiguration or an error, you just lose the logs, then start investigation. Check Wazuh service logs and see everything looks OK. Then, you go to next suspicious point, network and host firewalls. You see no problem. You then check your load balancer cluster, and see they work just fine. Then, you check Wazuh indexer and see that there is a problem. You check Index Management and other parts and see that shards and replicas are broken. But there is no alert, no notification. With some Google-fu, you tweak the settings and continue. You lost the logs but they are new. So, you need to update the `recovery.py` to read from current `alerts.log` by adding a `--live` parameter, instead of reading compressed backup files. It can be solved but it could have been prevented. Also, this shows that Wazuh is not a resilient system. A simple failure should not trigger DR runbooks -again.

![Wazuh when filebeat or indexer is broken](https://user-images.githubusercontent.com/39981909/228854119-0eb87958-67aa-43c8-b016-9ea78bcd0d74.jpg)
Wazuh when filebeat or indexer is broken


#### Hard-coded agent naming

When an agent enrolls itself to a Wazuh server environment, it uses the `hostname` as the agent name. In big environments there may be issues with naming -naming convention has changed through time, old name still exists for legacy reasons, or sometimes it returns FQDN while other times it returns simply the device name, etc. Unfortunately agent names cannot be changed at all. It is possible to hack your way into it but this is because the design. This was not planned at the beginning.

#### Agent ID issue

Agent IDs are (or should be) the unique identifiers for agents. After you remove an agent, a new agent might get an ID number that is previously used by another machine. It is possible that there is a mistake done during uninstallation and re-enrollment, and one has to query logs by `agent.id` and find previous agent name and/or IP address.

This would not occur if GUID/UUID or ULID was used for agent identities.

#### The Agent ID 000 issue

When network devices start to send syslog, it is collected by the `wazuh-manager`, then every log will be collected under Agent ID 000, even if you have dozens of different devices. This is not helpful when it comes to correlation. It would be great if Wazuh could provide virtual agent IDs per syslog source.

Just like Windows SIDs, it can be possible to have a two parts. A Windows SID has a domain ID and relative ID. So that it can be guaranteed to have unique IDs per domain. For Wazuh, it can be simpler: virtual agents and real agents. Then it will be also possible to have a segregation without labeling the incoming logs. It also can provide non-conflicting IDs.

Having IDs for agentless setup also helps better management for agentless configuration.

#### Disabling a ruleset

It's great to be able to use all rules by default. But it is a waste of resources if you don't need all rules -for instance if I don't have Fortinet and others. The only way is to remove the files from the folders. But as mentioned, this could and should be handled by the application. Ideally, the Wazuh UI should allow us to disable/unsubscribe a ruleset over UI.

#### It is confusing to write decoders/rules

There are many undocumented issues if you start writing custom decoders. You cannot write decoders if some fields are predecoded. Which ones? Who knows? 

When it comes to custom rules, the situation reappears in a different way. Some fields in the logs cannot be used when writing rules (https://github.com/wazuh/wazuh-documentation/issues/5981). For instance:
- `dstuser`, `srcip` and such are not usable as they are static values.
- `agent.*` properties
- `full_log`

Worst part is, the decoder and syntax checkers do not validate these field names. The only way is to write the decoder or rule, restart the cluster, wait for the logs, see the absence of rule, and then re-read the docs, ask Google or community.

### Security 

#### Lack of config file permission check

There is not a check for configuration files (https://github.com/wazuh/wazuh/issues/15741). If an admin accidentally allows `ossec.conf`, `shared.conf` to be writable by non-admin users aka others, then it is possible for an attacker to write a config to run commands under root or LOCAL SYSTEM privileges. It is a privilege escalation waiting to happen.

Have you used ssh and get this kind of error?
```
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions for 'private-key.ppk' are too open.
It is required that your private key files are NOT accessible by others.
This private key will be ignored.
Load key "private-key.ppk": bad permissions
```

These kind of security controls are products of lessons learned.

#### Lack of self auditing

User auditing on the Wazuh application itself is unfortunately very poor. It is because Wazuh depends on OpenSearch Security. It does not have an application level IAM. The user audit is based on database capabilities. It feels like late 90s where each Delphi based desktop applications connecting directly to databases with database user credentials. One praises SOA after those.

It is possible to audit user account auditing using undocumented capabilities of OpenSearch through Kibana aka `wazuh-dashboard`. You need to enable specific logs, then create index patterns and dashboards (https://github.com/wazuh/wazuh/issues/15039).

However, it is not possible to create Wazuh rules and alerts on the audit data. Because the data is already "in the database". You need to write a script to query the indexer, and send the results as a batch of logs to Wazuh manager via local pipe on a Wazuh node. That is not a scalable method as it should be done only on single Wazuh node. If you run the script on multiple nodes, there will be multiple alerts. Bye bye HA -partially.

#### Insecure admin account usage

The `admin` account is the initial administrator account in OpenSearch Security plugin for Wazuh management. It is analogous to the `root`. However, it is also used for Wazuh nodes to send logs as bulk to `wazuh-indexer` (https://github.com/wazuh/wazuh/issues/15148). Those services need a separate account with write permissions to specific indexes. Since this is a service account by definition, it means it should have no shell and no password on the server, and minimum permissions on database.

#### No integrity control for alerts 

Log archiving with plain text logs generally utilizes checksums for integrity of the old logs. It is the same with archive logs. But if you need integrity of the alerts to ensure a malicious actor cannot delete the alerts, then it is a bit complicated.

It is possible to update Wazuh alerts using the REST API. You can tamper the logs, inject data, modify fields, basically anything. Because you are connected the database directly. It is also possible to delete. Since Wazuh uses OpenSearch for alert storage, it is possible to delete the data by bulk using a simple query like `POST /<index name>/_delete_by_query {<query>}`, just like `rm -rf /var/ossec/logs/archive` for. With the lack of proper audit logging, it is not possible to get notified that the **alerts are lost forever** or **alerts are tampered**.

As mentioned, malicious actor can remove or tamper alerts partially or as a whole, and we might have no idea that logs are tampered. After a forensic analysis, it can be found later, yet it is hard to guarantee the integrity. Using index management, it is possible to set a 1 day period for hot state and X days for cold state before deleting, which might help tampering and deleting. But it can be cumbersome if you have a disaster scenario and you want to recover old logs. You need to first make the correct indexes writable, recover the logs, and convert back to read-only.

It is possible to utilize the immutable indices capability of OpenSearch in `wazuh-indexer` which is also an undocumented feature (https://github.com/wazuh/wazuh/issues/15020 and https://github.com/opensearch-project/documentation-website/issues/1436). That is the best way to provide integrity. But the side effect, just like any immutable storage, is you can **never** delete anything. Consider a scenario that an application accidentally enabled debug logs and leaked PII or credit card numbers into logs. It is a low probability incident and you have to accept the risk if you use immutable indexes.

Therefore, the integrity of alerts are not guaranteed by default within Wazuh. For your DFIR, you need to save the archive logs locally somewhere and ensure integrity based on logs, not alerts. 

#### Lack of hardening documentation

The only hardening advice is to change the passwords (https://documentation.wazuh.com/current/deployment-options/offline-installation.html#securing-your-wazuh-installation). Nothing for permissions, account usage, etc. It is hard to secure Wazuh after you install it.

Another hardening measure is using an agent enrollment password, yet it is not mentioned in hardening measures. It is presented as an optional feature. The risk there is when an attacker uses arbitrary packages with a fake agent, it is possible to DoS with sending logs in high volume (likelihood=high, severity=medium). The secondary risk occurs when there is a vulnerability on Wazuh manager: an attacker can send malicious data to vulnerable server using unauthenticated, fake agent.

It would be great if the docs specifically mention that *the `wazuh-manager` service acts as an agent but for `wazuh-indexer` you need to install `wazuh-agent` explicitly on the server(s)*. A warning or note on central component installation guide, and cluster architecture would suffice.

#### Hardening Wazuh daemons 

Due to the variety of the security mechanisms, it is hard to harden Wazuh without interrupting the workflow. Unfortunately, Wazuh does not provide methods to harden Wazuh daemons for AppArmor, SELinux, or PolKit setups. It would be great if there's a documentation for `systemd-analyze security <Wazuh service name>` command results. 

#### No authentication & authorization for agent install-uninstall

Any user with enough privileges on target computer, provided through either legitimate or malicious manners, can uninstall Wazuh agents on a compromised system. There is not an extra step for authentication and authorization.

#### Vulnerability management is a feature hard to maintain

Basically, the agent does a inventory of installed packages and updates on the OS and checks them against the database. It is not an equivalent to Nessus or OpenVAS scans. Also, since the status of the vulnerabilities are kept as logs and statistics, it is not possible to mark false positives, or accepted risks with a business justification (https://github.com/wazuh/wazuh-kibana-app/issues/4413). After some time, the vulnerability management dashboard becomes cluttered with noise which will make it unusable. 

### Compliance

#### PCI DSS compliance is bogus

The PCI DSS compliance settings of Wazuh are based on PCI DSS v3.1 (https://wazuh.slack.com/archives/C0A933R8E/p1666170922748739). The superseding version, PCI DSS v.3.2 was in force as of April 2016. It means **Wazuh PCI DSS compliance features were out-of-use for more than 6 years**.

#### Proper log archiving does not exist

The alerts are stored either in a `wazuh-indexer` or an `ElasticSearch` instance, along with an `alerts.log` file. All the logs collected -not the alerts- are stored on Wazuh server nodes in file `/var/ossec/logs/archive/archive.[log|json]`.

For the purpose of archiving for compliance with regulations, there is not a possibility to archive the alert logs on database (https://github.com/wazuh/wazuh-kibana-app/issues/4624). Also, for a forensic point of view, it is better to keep the all of logs for a proper timeline of incident, not just the alerts. It is possible to send not only the alerts but also the [archives to the indexer](https://documentation.wazuh.com/current/user-manual/manager/wazuh-archives.html#visualizing-the-events-on-the-dashboard), there is no integrity guarantee by default. It may be possible to enable immutable indices for archive logs only. But it needs to be tested.

The only proper way for archiving currently is to write alert logs locally on each `wazuh-manager` node, then move them to a network share. Even though there is a possibility of mounting an NFS share on `/var/ossec/logs/` path, it is not the best option due to network latency.

The optimal way of archiving logs is to keep them for a short time on Wazuh server node, like up to 3 days. Then, using a bash script or a synchronization tool, the compressed and signed logs can be copied to the network share. However, since each Wazuh server instance will create separate log files, there will be a separate log file per each node depending on the registered node. Because the server collecting the log for that agent can change in a cluster environment, there is no separation of data sources per archive log file. There may occur two problems for the files on a file share:

- If there is a lock on a file/folder from another node, the synchronization may fail.
- When a node copies a log to a network share, the naming includes the date. Another agent can overwrite the log files on the target because the name is the same: `ossec-archive-xx.log.gz`.

To solve both, we can create separate directories per each Wazuh server node. Even though this solves both problems, it adds a layer of complexity: as an agent can change the Wazuh server node to send the logs any time in a day, and several times in the long term, logs are distributed between separate folders. If one wants the logs from last 9 months for a device, the only solution is to run `zgrep` on all files. The is no way to consolidate the logs without breaking the built-in cryptographic signature.

What I could found is to disable Wazuh-managed compression and signing and utilize a custom workflow:
- Copy the log files to network share.
- Use a consolidation tool like [logmerge](https://github.com/microsoft/logmerge) from Microsoft, to create a separate file based on both logs.
- When successfully consolidated, remove the old log files.
- Compress and sign the merged log file.

There are more elegant solutions for this though. For instance, ArcSight uses a PostgreSQL server to collect all logs. Then with a job scheduler, it is possible to generate text logs on a file share by exporting from database. Then, it can be compressed and signed. The prerequisite is to mount the NFS share as a local mount point on each cluster member, so the manager at the time can handle the job.

Wazuh currently allows [outputting alerts to a database](https://documentation.wazuh.com/current/user-manual/manager/manual-database-output.html) via [wazuh-dbd](https://documentation.wazuh.com/current/user-manual/reference/daemons/wazuh-dbd.html), but not archive logs. And also, it does not provide a buffer in case of a network, server or database failure. It uses a file queue, however, [according to the code](https://github.com/wazuh/wazuh/tree/607aaa80bb42416757c2f62335cc1cc8ff2095eb/src/os_dbd), it does not implement any resiliency pattern such as retries, timeouts, circuit breakers, bulkhead, etc. If the database is not accessible for hours in case of an incident, then it will create error logs and **the logs are lost**. There must be an intermediate, a persistent buffer on each Wazuh node for reliability for `wazuh-dbd` too. 

Can you imagine a Citus powered distributed PostgreSQL cluster running on each Wazuh indexer server to keep archive logs, and Wazuh manager nightly runs tasks on cluster to export the logs to a directory, compresses and signs it? And it is configurable via UI. What a concept!

If Wazuh could manage to solve this one, then it would be great help. 

#### Archived logs are not forensically reliable

The logs have checksum values in the same directory. However, it is easy to alter the logs, recalculate the checksums, update the checksum file and modify `mtime`. 

Therefore, for a proper archiving solution, it is better to use a cryptographically proven timestamping solution like RFC 3161 and RFC 5816, a complementary proposal, timestamping the archived logs. I have created [an issue about it](https://github.com/wazuh/wazuh/issues/17290). 

Even though it is a simple improvement, it is actually a legal obligation in Turkey since 2007: If you keep DNS and internet access logs (if you are a service provider), you have to use cryptographic timestamps for the logs to be legally accepted forensic evidence. You can see it is an important point as SIEM developed in Turkey [mentions it as a feature](https://www.log-collector.com/product/5/LogCollector-LogStore). 


### Integration

#### Files are the universal interface

> This is the Unix philosophy: Write programs that do one thing and do it well. Write programs to work together. Write programs to handle text streams, because that is a universal interface.
> *Doug McIlroy*.

For Wazuh, files are the universal interface. If you have an application and you need to forward the logs to Wazuh, you have to store them to a file and let Wazuh read it from there. But the, you need to think about local log retention aka archival and removal. Unlike rsyslog, it is not possible to read from pipes, sockets, etc. with Wazuh agents (https://github.com/wazuh/wazuh/issues/15178).

In order to make CrowdSec work with Wazuh, I needed to create a [plugin](https://github.com/zbalkan/notification-file) -incomplete yet- which writes alerts into a json file, so that Wazuh can consume. It would be better if it was a pipe, socket, or even a REST API. 

### Support and Community

#### Community support issues

Sometimes, community support on Slack looks like documentation search by dialogs. Yes, most of the fine users do not read the docs and many problems are low hanging fruits. But if one asks a complicated question, it is unsatisfactory when you get a link to docs which is not the answer.

#### No community repository/hub/store for rules and decoders

Wazuh ruleset is updated as a part of each version change. However the ruleset is a baseline and it needs to be fine-tuned and tailored to the environment. That is why many custom decoders and rules are involved into the process. Many users around the world has their own custom rules. Some people [share their custom rules on Github](https://github.com/search?q=wazuh%20rules&type=repositories) generously. Yet, it would be better with a common place with a structured approach.

It would be great if Wazuh could provide a community repository for rules and decoders provided by community members, just like [Zabbix](https://github.com/zabbix/community-templates).  Also, for company tested and approved solutions, it would be also another good alternative to provide a hub like [Crowdsec](https://hub.crowdsec.net/browse/) does.