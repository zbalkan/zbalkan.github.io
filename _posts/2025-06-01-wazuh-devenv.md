---
title: "Detection-as-Code for Wazuh 4.x: A Practical Implementation Model"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Detection Engineering
  - Testing
---

At the beginning was the logs. Then, people started collecting, filtering, correlating, aggregating logs. They implemented data engineering pipelines for log data. Now, by means of writing detections, the area to take best practices from is the software engineering. There comes the field, Detection engineering. It is a relatively recent term found its way in taxonomy but it got caught very fast. However, it is a matter of scale and [maturity](https://www.elastic.co/security-labs/elastic-releases-debmm).

If you are running Wazuh in your environment in your organization either to protect your entity or others' as a service provider, you see that the biggest issue is the "customization tax"[^1]. You need to keep your detection rules up to date, working, not conflicting with each others. You need to write your suppressions properly.

These sound a lot like unit tests and regression tests. This is where Detection as Code (DaC)[^2] term of detection engineering field comes to play. Treat your detections as code, and make them testable. So that you can make use of generic CI/CD pipelines for all the capabilities. This will add accidental complexity as it is based on "how you solved the problem". The essential complexity, aka "the complex nature of the problem you are tying to solve" is already there: detecting suspicious and malicious activity with in a dumpster of logs. Therefore, you apply similar solutions to the similar problems, borrowing from the decades-long experience of software engineering field.

## The Problem

Custom detection rules and decoders in Wazuh are often built and deployed manually. They're copied directly into production systems, tested informally, and updated without peer review or rollback procedures. This leads to a number of operational challenges:

- A malformed rule can prevent Wazuh from starting.
- Rules may silently stop working after a schema change or decoder conflict.
- New rules might generate floods of false positives.
- There is no clear way to track changes, validate correctness, or ensure consistency.

This approach does not scale—neither for large teams nor for environments that require accuracy, auditability, or rapid iteration.

---

## Detection-as-Code as a Solution

**Detection-as-Code (DaC)** introduces engineering discipline into detection development. Instead of treating detections as one-off configurations, they are treated as structured code: versioned, reviewed, tested, and deployed in a controlled way.

For Wazuh 4.x, we’ve implemented a DaC model using a lightweight Python-based testing harness and a local Wazuh instance. This setup allows developers to:

- Develop and validate rules in isolation
- Use behavioral testing to confirm expected alerting
- Use Git workflows for collaboration and promotion
- Deploy only after tests and reviews have passed

---

## Workflow Overview

```text
1. Develop rules/decoders in a feature branch
2. Test locally using Wazuh Devenv + pytest
3. Open a pull request to the 'develop' branch
4. CI runs automated tests on the PR
5. Code review and approval
6. Merge to 'master' for deployment
7. Push files to Wazuh manager and restart service
```

This workflow reflects core Detection-as-Code practices: traceability, testability, and controlled promotion.

---

## Wazuh Devenv Testing Model

### Local Testing

- Rules are tested using a local Wazuh instance running on WSL or Linux VM.
- Sample logs are piped into Wazuh.
- Python test cases verify whether specific rules trigger or not.
- Preflight checks validate service health and configuration integrity.

### Example: Writing a Simple Test

```xml
<group name="custom,syslog">
  <rule id="100001" level="5">
    <decoded_as>syslog</decoded_as>
    <field name="full_log">user=root</field>
    <description>Alert when 'user=root' appears</description>
  </rule>
</group>
```

```text
Apr 17 14:00:01 host sshd[123]: user=root
```

```python
from framework.wazuh_test import send_log, assert_alert_present

def test_alert_on_root_user():
    log = open("tests/logs/test_root_user.log").read()
    send_log(log)
    assert_alert_present(rule_id=100001)
```

```bash
pytest -v
```

This allows detection engineers to confirm functionality before promoting rules to production.

---

## Alignment with Detection-as-Code Maturity

Based on the Elastic Detection Engineering Behavior Maturity Model (DEBMM), Wazuh Devenv addresses several critical areas:

| Domain                 | Status         | How it's Met                                                                 | Next Steps                                 |
|------------------------|----------------|------------------------------------------------------------------------------|--------------------------------------------|
| Process                | Partially Met  | Git workflow supports structure, but backlog and review cadence are manual | Add backlog tracking and agile routines    |
| Expressive Languages   | Not Met        | Wazuh 4.x uses XML; lacks modular or functional constructs                  | Explore templates or adopt Wazuh 5.x later |
| Reusable Components    | Partially Met  | Python tests are modular; rules and decoders reused manually               | Add templates and metadata schemas         |
| Version Control        | Fully Met      | Git is source of truth with branch strategy and reviews                    | Enforce tagging and commit standards       |
| CI/CD + Testing        | Mostly Met     | Local testing and pytest-compatible harness support automation             | Add static linting and rule coverage       |

This puts the project squarely in the **Tier 2 (Intermediate)** category and provides a strong base for growing into Tier 3 and 4 with structured effort.

---

## Regression Testing as a First-Class Feature

Every test case written in this model becomes part of a living regression suite. When rules are updated or new ones added, all tests are re-executed. This ensures:

- Existing logic isn’t broken silently
- Rule changes are safe and predictable
- Teams gain confidence before production deployment

---

## Deployment Simplicity

Once rules are approved and merged to `master`, they are copied to the Wazuh manager and loaded by restarting the service. There is no build pipeline or compilation step. The Git repo is the source of truth.

This simplicity encourages adoption, reduces operational overhead, and avoids hidden state.

---

## Conclusion

The Wazuh Devenv project demonstrates that Detection-as-Code is both achievable and practical—even in XML-based engines like Wazuh 4.x. By combining version control, behavioral testing, and structured workflows, detection engineers can:

- Safely iterate on detection logic
- Catch problems before they hit production
- Track what changed, when, and why

It’s a foundational step toward scalable, resilient, and auditable detection engineering.

Future work includes integration with rule metadata schemas, static rule linting, and migration paths for Wazuh 5.x’s new detection engine.

This isn’t a platform. It’s a discipline. And it starts with testing your rules—before they break something important.

---

[^1]: A term coined by [Adrian Sanabria](https://x.com/sawaba) of [Enterprise Security Weekly](https://www.youtube.com/@SecurityWeekly) and I loved it.
[^2]: Check [DataDog](https://www.datadoghq.com/blog/datadog-detection-as-code/)'s and [Elastic](https://www.elastic.co/blog/detections-as-code-elastic-security)'s approaches for DaC. They are great reads. But I cannot recommend [Panther](https://panther.com/blog/modernize-detection-engineering-with-detection-as-code) more in this field. They are trend setters in this field.
