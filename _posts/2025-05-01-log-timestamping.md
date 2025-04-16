---
title: "Cryptographic Timestamping for Wazuh Logs Using RFC 3161 and OpenSSL"
tags:
  - Wazuh
  - Detection
  - SIEM
  - Logging
  - RFC 3161
---

In security monitoring environments, log files are not just records of activity — they are often the primary evidence in incident response, threat investigations, and compliance audits. However, without cryptographic protections, logs can be altered, backdated, or tampered with. This undermines the integrity of your detection pipeline and may compromise forensic investigations or regulatory compliance.

This guide documents a practical, standards-based approach to ensuring **log integrity and proof of existence** using **RFC 3161 cryptographic timestamps**. It applies specifically to **Wazuh server logs**, but the pattern is adaptable to other platforms.

---

## Problem: Can You Prove Your Logs Are Untampered?

Standard log rotation and backup practices don’t provide cryptographic proof that a log file:

- Existed at a specific point in time.
- Has not been altered since.

Timestamps from filesystems (`mtime`, `ctime`) are easy to forge. Even centralized log management cannot prevent insider or post-compromise manipulation without some cryptographic anchor.

For instance, PCI DSS 4.0.1 Req. 10.3.2 says "Audit log files are protected to prevent modifications by individuals". While this generally means hardening security enough to prove a sufficient security, there is still room for improvement.

Wazuh checksum generates a .sum file that contains a log file's checksum value generated with multiple algorithms along with previous file's checksum vlues under `Chained checksum:` section. This is also not tamper proof. When a user changes a log file, they can tamper with the previous checksum file. It is not helpful by and of itself.

---

## Solution: RFC 3161 Timestamping with OpenSSL

We use the Time-Stamp Protocol (TSP) defined in **RFC 3161**, which allows a client to:

1. Hash a file using SHA-512.
2. Submit the hash to a trusted **Timestamping Authority (TSA)**.
3. Receive a cryptographically signed **Timestamp Response (TSR)** proving that the file existed in that form at that time.

This method:

- Never transmits the log file itself — only its hash.
- Produces portable `.tsr` files that can be verified independently.
- Works with any TSA that supports RFC 3161 (we use [freetsa.org](https://freetsa.org/)).

---

## Architecture: How We Protect Wazuh Logs

Each Wazuh node writes logs to:

```shell
/var/ossec/logs/archives/archives.json
```

These logs are compressed nightly. A Bash script then:

- Moves them to an NFS share for central retention.
- Renames them as: `YYYY-MM-DD-hostname.log.gz` (e.g., `2025-04-15-siem1.log.gz`)

This creates one new file per node per day, simplifying inventory and making it easy to track which node produced which file.

---

## Daily Integrity Workflow

### Step 1: Timestamp Logs

A cron job runs `sign_all.sh` every night after archive logs are compressed and moved to file share:

```bash
0 2 * * * /opt/timestamping/sign_all.sh
```

- Signs all `.log.gz` files that don't have an associated `.tsr`.
- Stores `.tsr` files in a specified output directory.
- Logs each action in `/var/log/timestamping/sign_all.jsonl`.

On day one, it signs all historical files. After that, it signs only new files.

### Step 2: Verify Logs

Later each day, a second cron job verifies the `.tsr` signatures:

```bash
0 5 * * * /opt/timestamping/verify_all.sh
```

- Verifies integrity of each file using its `.tsr`.
- Logs output to `/var/log/timestamping/verify_all.jsonl`.
- Exits with error codes for missing or failed evidence.

You can also verify more than once a day but if you are using a free service like FreeTSA, try not do DoS the system.

---

## Log Format and Evidence Retention

Each `.tsr` file is specific to one `.log.gz` file. These files must be retained together:

- Original log: `2025-04-15-siem1.log.gz`
- Timestamp response: `2025-04-15-siem1.log.gz.tsr`
- TSA certificates: `tsa.crt` and `cacert.pem`

**Without these**, future verification is not possible.

Sample log entry from `verify_all.jsonl`:

```json
{
  "timestamp": "2025-04-15T05:04:33Z",
  "event": "verified",
  "file": "/NFS/2025-04-15-siem1.log.gz",
  "details": {
    "timestamp": "Apr 15 02:01:29 2025 GMT",
    "serial": "0x0647C009"
  }
}
```

---

## Monitoring Timestamping Logs with Wazuh

To detect failures or tampering attempts within the timestamping pipeline itself, we configured Wazuh to ingest all timestamping logs:

```xml
<localfile>
  <log_format>json</log_format>
  <location>/var/log/timestamping/*</location>
</localfile>
```

This feeds all JSONL logs — such as `sign_all.jsonl`, `verify_all.jsonl`, task summaries, and error reports — directly into the Wazuh event pipeline.

---

## Wazuh Rule Integration

Wazuh rules inspect the `event` field in each log. For example, a `verify_failed` or `missing_tsr` event may indicate tampering or broken evidence chains.

Example rule definitions:

```xml
<!-- Rule: Timestamp verification failed -->
<rule id="100100" level="10">
  <if_sid>5750</if_sid>
  <field name="event">verify_failed</field>
  <description>Timestamp verification failed for log file</description>
</rule>

<!-- Rule: Missing TSR evidence file -->
<rule id="100101" level="12">
  <if_sid>5750</if_sid>
  <field name="event">missing_tsr</field>
  <description>Missing .tsr file — log integrity unverifiable</description>
</rule>
```

These rules allow the SOC to receive alerts and respond to issues in the evidence lifecycle immediately.

> TODO: Add screenshots from Wazuh Dashboard

---

## Summary

This RFC 3161-based process provides:

- **Cryptographic proof of existence** for each log file
- **Automated verification** of log integrity
- **SIEM integration and alerting** for failures or anomalies

The solution is standards-based, non-intrusive, and requires only minimal infrastructure. It can be extended to other log types, rotated data, or audit artifacts with no change to the core logic.
