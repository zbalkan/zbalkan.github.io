---
title: "Improve observability by integrating CrowdSec with Wazuh"
tags:
  - Wazuh
  - Crowdsec
  - SIEM
  - Detection
  - IDS
  - IPS
  - Integration
redirect_from: /2024/06/19/crowdsec-wazuh-integration.html
---

## What is CrowdSec?

[CrowdSec](https://www.crowdsec.net), or the component I used the [CrowdSec Security Engine](https://www.crowdsec.net/security-engine), may be considered as an open-source IDS/IPS depending on your configuration. Though, that is my view of it. They do not define the product that way. Here's their description:

> The CrowdSec Security Engine is an open-source, lightweight software that detects and blocks malicious actors from accessing your systems at various levels, using log analysis and threat patterns called scenarios.

<!--more-->

The CrowdSec  Security Engine (hereafter *agent*) reads logs (aka `data source`), parses them via `parsers`, and adds context via `enrichers`. Afterwards, if an event or a series of events are matched against `scenarios`. If there is a match, an `alert` is triggered. A nice addition to basic alerting is the `decisions` component. A decision, in CrowdSec terminology, is an abstraction for actions in case of a condition which has created the alert. Therefore, you define the consequence of the event. The alert may trigger a `notification`, and/or a `remediation`. A notification may be an email, an HTTP request, a Slack message, or just writing to a file. Notifications are great not only for notifying users but also integrating with other security tools.

On the other hand, it is possible to take actions such as blocking IP addresses using another component called `remediation components`, formerly  `bouncers`. Mostly these are IP blockers. It is also possible to write your own remediation scripts to trigger further actions.

One of the things I admire in CrowdSec is that it focuses on the use of CTI. It provides threat intelligence feeds which may be used to integrate your workflows. In the CrowdSec Console, if you create an account, you can enroll your agents to your account. Afterwards, you can subscribe to up to 3 free blocklists, register agents to the subscribed blocklists, and define the remediation. The default remediation alternatives ara `Ban` and `Captcha`, and `Custom`, which is a representation of the custom remediations configured for the selected agent.

Last but not least, I loved that CrowdSec had a marketplace from the start. It is called [CrowdSec Hub](https://hub.crowdsec.net/). There you can download collections (bundles of parsers and scenarios), configurations (single instances of parsers, scenarios, enrichers, etc.), remediation components like bouncers. At the time of writing, there are new categories added called `Appsec configurations` and `Appsec rules` in beta, but I am excluding them for the sake of brevity.

## Comparing with Wazuh -or any other SIEM, HIDS, HIPS

When you read the CrowdSec introduction above, you may think it is not so different than any other  host-based intrusion detection system (HIDS) or prevention system (HIPS). That's the first thing that came to my mind as well. According to the [duck test](https://en.wikipedia.org/wiki/Duck_test), I believe it is yet another HIDS/HIPS.

Technically, whatever you can do with CrowdSec can be done with Wazuh as well. You can trigger rules and use `active response` scripts to block IP addresses. The difference is in the details. CrowdSec is minimal, it does not require a central instance. The rules are processed locally, not on a dedicated server. The action is taken immediately. So, the load is distributed to agents. That might remind you [Ossec](https://www.ossec.net/), [Samhain](https://www.la-samhna.de/samhain/), [Sagan](https://github.com/quadrantsec/sagan) or others. What about EDRs?

On the other hand, Wazuh has thousands of rules, yet adding new rules requires writing your own rules manually within the pseudo-XML rule syntax. It also applies to the decoders -the ones named as `parser` in CrowdSec terminology. It would be amazing if there was a marketplace for community where we could download Wazuh decoders, rules, active response scripts, etc. I have already mentioned this on an earlier [blog post on Wazuh](https://zaferbalkan.com/2023/08/08/wazuh-pain-points.html#no-community-repositoryhubstore-for-rules-and-decoders).

## Scenario

Here, I created an integration scenario. Your organization is making use of Apache as load balancers and using ModSecurity as the WAF solution. Your organization likes open source stack and uses Wazuh as SIEM. Your team has already set up Wazuh agent on the servers, started to collect logs. In order for Wazuh to trigger rules, you need a level of verbosity. Since this is a load balancer cluster, both the Apache and ModSecurity logs are bombarded. Wazuh has a buffer to keep 1000 message by default. Your team then updates the buffer capacity to 10.000 but the buffer still gets flooded. The leaky bucket algorithm tries to save memory and protect your server's integrity. So, you are losing logs which may or may not be valuable. At the same time, Wazuh server is also bombarded by this noise wih the hope that the logs managed to arrive at the log collector would be the ones that matter. The SIEM is supposed to be your [common operational picture (COP)](https://en.wikipedia.org/wiki/Common_operational_picture), but your loss of valuable data in random noise, prevents you to evaluate the situation accurately.

Since you saw that this is not the most optimal way to solve this, you decided to handle alerting at the source. You decided to add another layer between your WAF and SIEM. Here comes your CrowdSec agent in place. You started your evaluation by recreating your system.

- You downloaded [the Ubuntu server ISO](https://releases.ubuntu.com/noble/ubuntu-24.04-live-server-amd64.iso), and verified the checksum
- You used your VMware Workstation to create a VM.
- You updated all the packages for a fresh start.
- You then installed Apache with a single HTML file following [a tutorial](https://ubuntu.com/tutorials/install-and-configure-apache) for the sake of simplicity. Even though the actual case was a load balancer, you don't want to create another server just to replicate load balancing.
- You then installed [ModSecurity](https://owasp.org/www-project-modsecurity/) and downloaded the [OWASP Core Rule Set](https://github.com/coreruleset/coreruleset/).

  ```shell
  wget https://github.com/coreruleset/coreruleset/archive/v4.3.0.zip
  sha1sum v4.3.0.zip && echo ProvidedChecksum
  unzip v4.3.0.zip
  mv coreruleset-4.3.0/crs-setup.conf.example /etc/modsecurity/crs-setup.conf
  mv coreruleset-4.3.0/rules/ /etc/modsecurity/
  ```

- Now that you installed the module and the rule set, you configure Apache for ModSecurity. You opened the file `/etc/apache2/mods-enabled/security2.conf` with your preferred text editor and ensured that these lines exist:

```shell
IncludeOptional /etc/modsecurity/*.conf
Include /etc/modsecurity/rules/*.conf
```

- Since you already copied the rules to default rule directory, you then commented out this line in the same file:

```shell
IncludeOptional /usr/share/modsecurity-crs/*.load
```

- Now that you have a working Apache web server with ModSecurity configured. ModSecurity is in detection mode by default. But you want to use CrowdSec as the blocking mechanism, so you leave it as is.
- Then you installed the CrowdSec using the [docs](https://doc.crowdsec.net/docs/getting_started/install_crowdsec).

```shell
curl -s https://install.crowdsec.net | sudo sh # Set up the CrowdSec repository
apt install crowdsec
```

**N.B:** If you accidentally skipped the first line and installed it from existing Ubuntu/Debian repositories, then you may need to fix the locations. Use [the bash script here](https://gist.github.com/LaurenceJJones/6960107296145e8e365009973b9d7f6d) to fix it. The reason is that `/var/lib/crowdsec/hub` is where Debian package stores the hub data whilst CrowdSec stores it on `/etc/crowdsec/hub/`. Remember to use the vendor's repository.

- After installation, you wanted to configure the integration. Your idea is to write the alert notifications to a file, where you can configure the Wazuh agent to read from. Your first attempt is to use the file notification plugin, which is available as of version 1.6.2. You opened the file `/etc/crowdsec/profiles.yaml` with your preferred text editor. You saw the default configuration:

```yml
name: default_ip_remediation
#debug: true
filters:
 - Alert.Remediation == true && Alert.GetScope() == "Ip"
decisions:
 - type: ban
   duration: 4h
#duration_expr: Sprintf('%dh', (GetDecisionsCount(Alert.GetValue()) + 1) * 4)
# notifications:
#   - slack_default  # Set the webhook in /etc/crowdsec/notifications/slack.yaml before enabling this.
#   - splunk_default # Set the splunk url and token in /etc/crowdsec/notifications/splunk.yaml before enabling this.
#   - http_default   # Set the required http parameters in /etc/crowdsec/notifications/http.yaml before enabling this.
#   - email_default  # Set the required email parameters in /etc/crowdsec/notifications/email.yaml before enabling this.
on_success: break
```

- You only needed the file plugin, so you ended up with this configuration instead. You leave the decision as is for testing phase:

```yml
name: default_ip_remediation
#debug: true
filters:
 - Alert.Remediation == true && Alert.GetScope() == "Ip"
decisions:
 - type: ban
   duration: 4h
#duration_expr: Sprintf('%dh', (GetDecisionsCount(Alert.GetValue()) + 1) * 4)
notifications:
    - file_default
on_success: break
```

- Wazuh can parse many types of logs but JSOn is easier because you don't need to write decoders for fields. Luckily (!) the logs are written in NDJSON format, therefore Wazuh jan read them as is when configured. But, in order to prevent field name conflicts, you decided to add a static root field: instead of a field like `data.alert`, you can have `data.crowdsec.alert`. So, you update the file `/etc/crowdsec/notifications/file.yaml`:

```yml
# Don't change this
type: file

name: file_default # this must match with the registered plugin in the profile
log_level: info # Options include: trace, debug, info, warn, error, off

# This template render all events as ndjson
format: |
  \{\{range . -\}\}
   { "crowdsec": { "time": "{{.StopAt}}", "program": "crowdsec", "alert": \{\{. | toJson \}\} }}
  \{\{ end -\}\}

# group_wait: # duration to wait collecting alerts before sending to this plugin, eg "30s"
# group_threshold: # if alerts exceed this, then the plugin will be sent the message. eg "10"

#Use full path EG /tmp/crowdsec_alerts.json or %TEMP%\crowdsec_alerts.json
log_path: "/tmp/crowdsec_alerts.json"
rotate:
  enabled: true # Change to false if you want to handle log rotate on system basis
  max_size: 500 # in MB
  max_files: 5
  max_age: 5
  compress: true
```

**N.B:** Due to the markdown renderer, the fields in double brackets are not rendered. I had to use an escape character (`\`) for them. So, please remove the escape character (`\`) from `\{\{` and `\}\}` in the `format` field.

- You noticed that there is a rotate section in the configuration. You don't need to use logrotate and disposal scripts with cron jobs. That looked convenient.
- Then, you needed to configure CrowdSec to read Apache and ModSecurity logs. You start by installing the collections.

```shell
 cscli parsers install crowdsecurity/apache2-logs
 cscli collections install crowdsecurity/modsecurity
 systemctl reload crowdsec
```

- You needed to update the configuration for acquisition of data sources and reload CrowdSec daemon:

```yml
---
filename: /var/log/apache2/*.log
labels:
  type: apache2
---
filenames:
  - /var/log/apache2/*.log
  - /var/log/nginx/*.log
labels:
  type: modsecurity
```

- You saw the same logs are labeled as both `apache2` and `modsecurity`, but that is for parsers. We need them there.
- You then downloaded the remediation component called [cs-firewall-bouncer](https://app.crowdsec.net/hub/author/crowdsecurity/remediation-components/cs-firewall-bouncer) in order to make use of the local firewall to be used by CrowdSec to block IPs. However, you don't configure it because you only need alerts during the test. It is possible to configure the remediation component afterwards.
- Next steps are about Wazuh. You start with downloading [the all-in-one (AIO) OVA file](https://documentation.wazuh.com/current/deployment-options/virtual-machine/virtual-machine.html) based on Amazon Linux 2.
- You updated all the packages, check that everything is just working. You ensured you have access to the dashboard over `http://<server IP>`.
- You went back to your web server to Install Wazuh agent.

```shell
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && chmod 644 /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee -a /etc/apt/sources.list.d/wazuh.list
apt-get update

## Let's now install
WAZUH_MANAGER="<Wazuh server IP>" apt-get install wazuh-agent
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent
```

- You needed to ensure the agent reads the logs defined in the plugin configuration. By default, it is `/tmp/crowdsec_alerts.json`. Instead of using local configuration, you wanted to make use of [centralized configuration](https://documentation.wazuh.com/current/user-manual/reference/centralized-configuration.html) to manage this change centrally, which makes it more maintainable. On Wazuh dashboard, you clicked the *Endpoint Groups* on the left-hand side. Then, you hit the button *Add new group* to create a new group called `crowdsec-clients`.
- After the group was created, you clicked the pencil icon to edit the configuration. Groups are explicit policy scopes. Therefore, when you update the configuration, it will be applied to the agents which are members of this group. In the empty configuration page, you created this configuration to read the CrowdSec alerts:

```xml
<agent_config>
    <localfile>
        <location>/tmp/crowdsec_alerts.json</location>
        <log_format>json</log_format>
        <only-future-events>no</only-future-events>
    </localfile>
</agent_config>
```

- You then saved it. Instead of waiting for some time for the agent to read the configuration change, you manually restarted the Wazuh agent on your web server.
- However, without a rule triggering an alert on Wazuh, the CrowdSec alerts are not useful here. So, you visited the Wazuh rules page -on the left-hand side, under Server Management section.
- You clicked *Manage rule files* and then filtered by using the button on the right with text *Custom rules*. You saw the file called `local_rules`. You don't have to use the same file. But for test purposes, you decided to use it. You created two rules. One for all the alerts with level 12, and another one for test alerts with level 3, based on [the rule classification guidelines](https://documentation.wazuh.com/current/user-manual/ruleset/rules-classification.html):

```xml
<group name="crowdsec,">
    <!-- We assume that all CrowdSec-generated alerts are important -->
    <rule id="100002" level="12">
        <decoded_as>json</decoded_as>
        <field name="crowdsec.program">crowdsec</field>
        <description>CrowdSec alert: $(crowdsec.alert.message)</description>
    </rule>

    <!-- We can decrease the level of the test message -->
    <rule id="100003" level="3">
        <if_sid>100002</if_sid>
        <field name="crowdsec.alert.message">test alert</field>
        <description>Test alert for CrowdSec.</description>
    </rule>
</group>
```

- In order to apply the change, you clicked *Save* and then *Restart* to update Wazuh server configuration.
- Then you wanted to test if the integration you created would work. You used the CrowdSec command `cscli notifications test file_default` to create a test message. It created an alert (below) in the file, and an alert is created on Wazuh side as well (below that):

```json
{"crowdsec":{"time":"2024-06-19T09:08:15Z","program":"crowdsec","alert":{"capacity":0,"created_at":"2024-06-19T09:08:15Z","decisions":[{"duration":"4h","origin":"cscli","scenario":"test alert","scope":"Ip","type":"ban","value":"10.10.10.10"}],"events":[],"events_count":1,"labels":null,"leakspeed":"0","message":"test alert","scenario":"test alert","scenario_hash":"","scenario_version":"","simulated":false,"source":{"ip":"10.10.10.10","scope":"Ip","value":"10.10.10.10"},"start_at":"2024-06-19T09:08:15Z","stop_at":"2024-06-19T09:08:15Z"}}}
```

```json
{
  "agent": {
    "ip": "<client IP>",
    "name": "crowdsecclient",
    "id": "001"
  },
  "manager": {
    "name": "wazuh-server"
  },
  "data": {
    "crowdsec": {
      "alert": {
        "simulated": "false",
        "created_at": "2024-06-19T09:08:15Z",
        "source": {
          "ip": "10.10.10.10",
          "scope": "Ip",
          "value": "10.10.10.10"
        },
        "message": "test alert",
        "start_at": "2024-06-19T09:08:15Z",
        "capacity": "0",
        "labels": "null",
        "events_count": "1",
        "leakspeed": "0",
        "scenario": "test alert",
        "decisions": [
          {
            "duration": "4h",
            "scenario": "test alert",
            "origin": "cscli",
            "scope": "Ip",
            "type": "ban",
            "value": "10.10.10.10"
          }
        ],
        "events": [],
        "stop_at": "2024-06-19T09:08:15Z"
      },
      "time": "2024-06-19T09:08:15Z",
      "program": "crowdsec"
    }
  },
  "rule": {
    "firedtimes": 2,
    "mail": false,
    "level": 3,
    "description": "Test alert for CrowdSec.",
    "groups": [
      "crowdsec"
    ],
    "id": "100003"
  },
  "decoder": {
    "name": "json"
  },
  "full_log": "{\"crowdsec\":{\"time\":\"2024-06-19T09:08:15Z\",\"program\":\"crowdsec\",\"alert\":{\"capacity\":0,\"created_at\":\"2024-06-19T09:08:15Z\",\"decisions\":[{\"duration\":\"4h\",\"origin\":\"cscli\",\"scenario\":\"test alert\",\"scope\":\"Ip\",\"type\":\"ban\",\"value\":\"10.10.10.10\"}],\"events\":[],\"events_count\":1,\"labels\":null,\"leakspeed\":\"0\",\"message\":\"test alert\",\"scenario\":\"test alert\",\"scenario_hash\":\"\",\"scenario_version\":\"\",\"simulated\":false,\"source\":{\"ip\":\"10.10.10.10\",\"scope\":\"Ip\",\"value\":\"10.10.10.10\"},\"start_at\":\"2024-06-19T09:08:15Z\",\"stop_at\":\"2024-06-19T09:08:15Z\"}}}",
  "input": {
    "type": "log"
  },
  "@timestamp": "2024-06-19T09:08:16.381Z",
  "location": "/tmp/crowdsec_alerts.json",
  "id": "1718788096.977749",
  "timestamp": "2024-06-19T09:08:16.381+0000",
  "_id": "tQ7BL5AB_SrqWQ8oEulT"
}
```

- After you tested that the alerts triggered on both CrowdSec and Wazuh sides, you wanted to run another test. You used an existing Kali VM you kept for test purposes. After running `nikto -host <Web server IP> -C all`  saw alerts below and ensured that the current integration works as expected.

```plain
CrowdSec alert: Ip <Kali IP> performed 'crowdsecurity/http-probing' (11 events over 54.521835ms) at 2024-06-19 14:30:07.169117736 +0000 UTC
CrowdSec alert: Ip <Kali IP> performed 'crowdsecurity/http-crawl-non_statics' (41 events over 181.760288ms) at 2024-06-19 14:30:07.285270735 +0000 UTC
CrowdSec alert: Ip <Kali IP> performed 'crowdsecurity/http-sensitive-files' (5 events over 311.465364ms) at 2024-06-19 14:30:07.512934836 +0000 UTC
CrowdSec alert: Ip <Kali IP> performed 'crowdsecurity/http-admin-interface-probing' (5 events over 2.286879469s) at 2024-06-19 14:30:10.605238917 +0000 UTC
CrowdSec alert: Ip <Kali IP> performed 'crowdsecurity/http-path-traversal-probing' (4 events over 6.038994648s) at 2024-06-19 14:30:31.685366048 +0000 UTC
```

- Now that the integration is completed, it is possible to create custom dashboards dedicated to crowdsec alerts. But that is up to the imagination of the security team.

## Discussion

The integration model discussion started over a year ago, when I was trying to design a fully open source WAF stack integrated into SIEM. The file plugin is relatively new while the idea was not. The first commit on the [file notification plugin](https://github.com/zbalkan/notification-file) shows November 1, 2022, when I asked the question and started to build something with the help of [Laurence Jones](https://github.com/LaurenceJJones) of CrowdSec. There were some issues, and it was my first project in Go language. The CrowdSec released the file plugin with version [1.6.2](https://github.com/crowdsecurity/crowdsec/releases/tag/v1.6.2), which finally obsoleted the stillborn plugin attempt of mine.

After this integration, you can build your dashboards, add the threat feeds to your agents to block known malicious IPs, make use of CrowdSec CTI API to enrich Wazuh alerts by writing your integration scripts on server side.

By the way, it is also possible to make use of Wazuh `active response` scripts instead of CrowdSec `remediation components`. Then, action will be taken after the alert is triggered on Wazuh side, which would add some latency. It depends on the preference. I like the convenience of not writing custom scripts but making use of components I can download from the Hub.

Now, you can upgrade your Apache+ModSecurity stack with CrowdSec, offloading the analysis and response to the servers. Then, you can send only alerts instead of hundreds of logs on the SIEM side. If you need further details, you can write your own scenarios. Here, I mentioned Wazuh, yet it is possible to use this integration with any other SIEM using the same steps.
