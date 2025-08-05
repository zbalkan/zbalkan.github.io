---
title: "Detection-as-Code for Wazuh 4.x: A Practical Implementation Model"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Detection Engineering
  - Testing
  - Detection-as-Code
galleryGraph:
  - url: /assets/devenv-dac.png
    image_path: /assets/devenv-dac.png
galleryTree:
  - url: /assets/devenv-tree.png
    image_path: /assets/devenv-tree.png
galleryLogtest:
  - url: /assets/devenv-logtest.png
    image_path: /assets/devenv-logtest.png
galleryDebmm:
  - url: /assets/devenv-debmm.png
    image_path: /assets/devenv-debmm.png
---

At the beginning were the logs. Then, people started collecting, filtering, correlating, and aggregating them. They implemented data engineering pipelines for log data. Now, it is the software engineering's turn to take the best practices. In combination with these, the discipline of detection engineering has slowly arisen for the last decade. It is a relatively recent term that has found its way into taxonomy, but it caught on very fast. However, it is a matter of scale and [maturity](https://www.elastic.co/security-labs/elastic-releases-debmm).

If you are running Wazuh in your environment in your organization, either to protect your entity or others' as a service provider, one of the primary operational challenges you would face is the "customization tax"[^1]. You need to keep your detection rules up to date, working, and not conflicting with each other. You need to write your suppressions properly as well.

If you have ever written software more complex than basic scripting, the solution to the problems above may sound a lot like unit tests and regression tests to you. And you'd be right. This is where Detection as Code (DaC)[^2], a term of the detection engineering field, comes into play. Treat your detections as code, and make them testable. So that you can make use of generic CI/CD pipelines for all the capabilities. This will add accidental complexity as it is based on "how you solved the problem". The essential complexity, aka "the complex nature of the problem you are trying to solve,"[^3] is already there: detecting suspicious and malicious activity within a dumpster of logs. Therefore, you apply similar solutions to similar problems, borrowing from the decades-long experience of the software engineering field.

## The problem and the solution

Custom detection rules and decoders in Wazuh are often built and deployed manually. They're copied directly into production systems, tested informally, and updated without peer review or rollback procedures. This leads to several operational challenges:

- A malformed rule can prevent Wazuh from starting.
- Rules may silently stop working after a schema change or decoder conflict.
- New rules might generate floods of false positives.
- There is no clear way to track changes, validate correctness, or ensure consistency.

This approach does not scale—neither for large teams nor for environments that require accuracy, auditability, or rapid iteration.

What would be the easiest way to solve this problem? Well, a test or staging environment that identical to the production would allow testing of decoders and rules. That is what we did as well. But after some time, test environment starts to differ, a phenomenon called **configuration drift**. The configurations, system settings, environments slowly drift away from their original or defined configuration as time progresses. While it happens on production environments as well, what we care about is the intention or purpose: the purpose of the test/staging environment is to be identical to production. They both drift from the initial state in time while one of them is trying to catch up with the other. This approach is destined to fail. You can build workarounds like resetting test environments periodically. But it becomes a maintenance burden, and most of the time test environment gets  abandoned. Your job is to detect threats in your environment, not maintaining a legacy system.

**Detection-as-Code (DaC)**, at this point, introduces an engineering discipline into detection development. Instead of treating detections as one-off configurations, they are treated as structured code: versioned, reviewed, tested, and deployed in a controlled way.

For Wazuh 4.x, I've implemented a DaC model using a lightweight Python-based testing harness and a local Wazuh instance. This setup allows developers to:

- Develop and validate rules in isolation
- Use behavioral testing to confirm expected alerting
- Use Git workflows for collaboration and promotion
- Deploy only after tests and reviews have passed

Wazuh recently published a blog article called [Wazuh ruleset as code (RaC)](https://wazuh.com/blog/wazuh-ruleset-as-code-rac/). I suggest reading it first, then proceeding with this article. The two articles complement each other.
{: .notice--info}

I must warn that it is possible to store configurations, rules and decoders in a repository by keeping the workflow as is. But if that repository is not your source of truth, it is just a glorified backup. It will start drifting from production as well.
{: .notice--warning}

## Workflow Overview

{% include gallery id="galleryGraph" caption="Detection-as-Code workflow samples" %}

It all starts with logs. You need to obtain sample logs for whatever the new data source is. I am more into the [Red, Green, Refactor](https://martinfowler.com/bliki/TestDrivenDevelopment.html) motto of test-driven development. While I suggest you Google and learn this interesting topic by yourselves, I can summarize so as not to break your attention flow. In TDD, tests are your requirements or specs. So, for `Red, Green, Refactor`, the developer starts with writing tests as software-defined requirements. Then, without any piece of code, the tests would fail; hence, the first step is `Red`. Afterwards, the developers start writing code to meet the requirements, ensuring the tests pass, so that the tests are `Green`. At this point, you meet your functional requirements. So, you can proceed with `Refactor` and ensure not breaking the tests.

For security folks with no software development background, I need to mention what refactoring means. Tight deadlines, lack of experience, bad management, or clever(!) shortcuts cause `dirty code`. Dirty code is hard to read, hard to understand, and worse, hard to maintain in the long term. In order to make your code clean, you invest your time and effort to ensure you do not break the code while making it easier to maintain.
{: .notice--info}

After we get the logs, we write tests, then build our detection building blocks like decoders and rules. When the tests start passing, you can deploy to your instance. But if you are in a larger environment than your homelab, you will need version control, proper change management, and extra validations. Generally, tools like GitHub, Gitlab, Gitea, Bitbucket would help you here, optionally with a pinch of Jenkins, JFrog, etc. For the sake of clarity, I am going to leave it out of the scope of this article because it depends on the golden triad of people, process, and technology, in that order.

In the end, I built the testing framework for Wazuh rules, [wazuh-devenv](https://github.com/zbalkan/wazuh-devenv). I used the term `devenv` specifically since I care about the testing part in the eyes of the developers or detection engineers. We need something that can run in the IDE or CLI. The same testing framework can be used for further steps in your pipelines, or even a Breach and Attack Simulation (BAS) process.

I had a local test environment in WSL just to use `wazuh-logtest`. The idea of writing a test framework around it came a bit later, around September 2014. Originally, I started developing this framework around October 2024, and I believe it is mature enough to let others utilize it.
{: .notice--primary}

## Wazuh-devenv Testing Model

Please check the [README file](https://github.com/zbalkan/wazuh-devenv/blob/main/README.md#installation) of the project for installation instructions. Here, the focus is on the tests. Now, let's write our first test. In the `wazuh-devenv` project structure, you'll see that the tests are categorized under 3 directories: preflight_tests, regression_tests, and behavioral_tests.

{% include gallery id="galleryTree" caption="Directory tree in VS Code" %}

- `preflight_tests`: These are tests you should not touch. They check the correct file permissions and Wazuh service availability.
- `regression_tests`: These tests are the ones you must focus on.
  - `builtin`: These are generated from the INI-formatted tests from [the Wazuh repository](https://github.com/wazuh/wazuh). I developed a test generator for this purpose, then manually fixed the remaining problems, and pasted the test code into this repository. The directory contains 1635 tests, an 75 out of them are skipped for various reasons. The top reason is the `send_multiple_logs` function, that accepts a list of logs as an input. It is useful for temporal rules like "Multiple failed logins" where **N number of logs within T seconds** must trigger an alert. We skip multiple single-item test and merge into a combined test accepting multiple logs. As a side note, I do not suggest running builtin tests very often as they would require 20-30 mins under a 4GB RAM, 2 CPU environment. You do not need to touch this folder at all.
  - `custom`: **This is the place you must write the tests for your custom rules**. It is under regression tests as they are testing whether your rules are working or not after changes.
- `behavioral_tests`: This directory is designed for Breach and Attack Simulations or advanced testing scenarios. You can read this old article on testing Wazuh with Atomic Red Team. This is an advanced case and out of the scope of this article. If you want to give it a try on behavioral tests, check [these](https://socfortress.medium.com/validate-your-security-detection-rules-23e90a256ae8) [two](https://socfortress.medium.com/how-to-run-atomic-red-team-on-linux-and-automate-attack-simulations-with-velociraptor-d4b52b05721b) articles by Taylor Walton on utilizing Atomic Red Team and Wazuh, and make up your mind on how to build a behavioral test pipeline.

We'll write our first test based on an old article on the Wazuh blog, [Creating decoders and rules from scratch](https://wazuh.com/blog/creating-decoders-and-rules-from-scratch/). Following the workflow, let's get the log first.

```js
date=2019-10-10 time=17:01:31 devname="FG111E-INFT2"
```

This does not look like one of our well-known formats. Let's write the first test code to fail.

```python
#!/usr/bin/python3

import unittest

from internal.logtest import LogtestStatus, send_log


class TestCustomFortigateRules(unittest.TestCase):

    def test_basic_log(self) -> None:
        log = 'date=2019-10-10 time=17:01:31 devname="FG111E-INFT2"'
        response = send_log(log)

        # Test the response

        # Ensure there is a rule match
        self.assertEqual(response.status, LogtestStatus.RuleMatch)
```

First of all, we create a test class for a structured approach. Inside the class, we create our first test code. We define the log as a string. Thn we make use of the `send_log` function provided by the test framework. You can see it is imported from `internal.logtest` namespace. Under the hood, this code sends the provided log to your running Wazuh Manager service programmatically, and get a Python object. The response is of type `LogtestResponse` which has properties like `status`, `full_log`, `timestamp`, `alert`, `output`, `location`, `decoder`, `rule_id`, `rule_level`, `rule_groups`, etc. The foundational test case above checks if there is a rule match. since we did not write a rule, this will fail by default.

Now, we must run our test with `python src/tester.py --disable-behavioral --disable-builtin`

```js
Running tests.preflight_tests tests...
........
----------------------------------------------------------------------
Ran 8 tests in 0.087s

OK
Status: OK
Ran: 8
Failures: 0
Errors: 0

Running tests.regression_tests.custom tests...
F
======================================================================
FAIL: test_basic_log (tests.regression_tests.custom.test_custom_fortigate_rules.TestCustomFortigateRules)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/home/zafer/wazuh-devenv/src/tests/regression_tests/custom/test_custom_fortigate_rules.py", line 17, in test_basic_log
    self.assertEqual(response.status, LogtestStatus.RuleMatch)
AssertionError: <LogtestStatus.NoDecoder: 3> != <LogtestStatus.RuleMatch: 1>

----------------------------------------------------------------------
Ran 1 test in 1.158s

FAILED (failures=1)
Status: FAILED
Ran: 1
Failures: 1
Errors: 0

Test details:
Failure in test_basic_log (tests.regression_tests.custom.test_custom_fortigate_rules.TestCustomFortigateRules):
Traceback (most recent call last):
  File "/home/zafer/wazuh-devenv/src/tests/regression_tests/custom/test_custom_fortigate_rules.py", line 17, in test_basic_log
    self.assertEqual(response.status, LogtestStatus.RuleMatch)
AssertionError: <LogtestStatus.NoDecoder: 3> != <LogtestStatus.RuleMatch: 1>

All tests completed. Exiting.
See the logs at /var/ossec/logs/tester.log
```

We are on the `Red` phase of our `Red, Green, Refactor` process. Let's write our custom decoders and rules then. Since decoders are our first building block, we must start with them.

```xml
<decoder name="fortigate-custom">
  <prematch>^date=\d\d\d\d-\d\d-\d\d time=\d\d:\d\d:\d\d devname="\S+"</prematch>
</decoder>

<decoder name="fortigate-custom1">
  <parent>fortigate-custom</parent>
  <regex>^date=(\d\d\d\d-\d\d-\d\d) time=(\d\d:\d\d:\d\d) devname="(\S+)"</regex>
  <order>date, time, devname</order>
</decoder>

<decoder name="fortigate-custom1">
  <parent>fortigate-custom</parent>
  <regex>devid="(\S+)" logid="(\S+)" type="(\S+) subtype="(\S+)"</regex>
  <order>devid, logid, type, subtype</order>
</decoder>

<decoder name="fortigate-custom1">
  <parent>fortigate-custom</parent>
  <regex>srcip="(\S+)"|srcip=(\S+) </regex>
  <order>srcip</order>
</decoder>

<decoder name="fortigate-custom1">
  <parent>fortigate-custom</parent>
  <regex>dstip=(\S+) </regex>
  <order>dstip</order>
</decoder>

<decoder name="fortigate-custom1">
  <parent>fortigate-custom</parent>
  <regex>action="(\S+)" </regex>
  <order>action</order>
</decoder>
```

We must now proceed with our rules. I picked an arbitrary rule ID. You can pick whatever you want.

```xml

<group name="custom,fortigate,">
    <rule id="222000" level="3">
    <decoded_as>fortigate-custom</decoded_as>
    <description>Fortigate messages grouped.</description>
    </rule>
</group>

```

Let's re-run the tests after this change.

```js
Running tests.preflight_tests tests...
........
----------------------------------------------------------------------
Ran 8 tests in 0.054s

OK
Status: OK
Ran: 8
Failures: 0
Errors: 0

Running tests.regression_tests.custom tests...
.
----------------------------------------------------------------------
Ran 1 test in 0.432s

OK
Status: OK
Ran: 1
Failures: 0
Errors: 0

All tests completed. Exiting.
See the logs at /var/ossec/logs/tester.log
```

Now we are in the `Green` phase of our `Red, Green, Refactor` process. You can proceed with refactoring by adding more specific tests to ensure it behaves the way you intend to.

```python

        # Ensure there is a decoder matching
        self.assertEqual(response.decoder, 'fortigate-custom')

        # Ensure the rule information is descriptive
        self.assertEqual(response.rule_description,
                         'Fortigate messages grouped.')

        # Use an available rule ID
        self.assertEqual(response.rule_id, '222000')

        # Ensure the rule level is correct
        self.assertEqual(response.rule_level, 3)

        # Ensure the parsed data is correct
        self.assertEqual(response.get_data_field(['date']), '2019-10-10')
        self.assertEqual(response.get_data_field(['time']), '17:01:31')
        self.assertEqual(response.get_data_field(['devname']), 'FG111E-INFT2')

        # Ensure the rule groups are correct
        self.assertIn('custom', response.rule_groups)
        self.assertIn('fortigate', response.rule_groups)
```

You can manually validate the result as well. Just copy the log to the `wazuh-logtest` tool, and proceed.

{% include gallery id="galleryLogtest" caption="wazuh-logtest result" %}

This approach allows detection engineers to confirm functionality before promoting rules to production. Even if you don't consider yourself a detection engineer but a sysadmin, a security analyst, a homelab owner, or a single-person-IT-department, there's room for improvement in your daily workload.

## What's the value?

How does this additional complexity improve your detection environment? I wanted to describe the added values shortly after the tutorial.

### Value measured by Detection-as-Code Maturity

The [Elastic Detection Engineering Behavior Maturity Model (DEBMM)](https://www.elastic.co/security-labs/elastic-releases-debmm) is a structured framework for evaluating and improving how security teams develop, test, deploy, and maintain detection rules. It defines maturity across several key areas including telemetry integration, threat landscape alignment, false positive/negative reduction, stakeholder collaboration, and automation. Each area is broken down into qualitative behaviors and quantitative metrics, allowing teams to assess where they stand and what operational capabilities are required to progress.

{% include gallery id="galleryDebmm" caption="Detection Engineering Behavior Maturity Model" %}

DEBMM addresses the common challenges faced in detection engineering: outdated or static rules, inconsistent testing, lack of telemetry context, poor integration with threat intelligence, and reactive tuning. By introducing defined maturity tiers and measurable criteria, it enables teams to move from ad hoc processes to disciplined, automated, and intelligence-driven detection workflows. The added value lies in improved rule fidelity, reduced alert noise, faster adaptation to new threats, and clearer prioritization of engineering efforts. However, reaching higher maturity levels involves non-trivial investment—engineering time, automation infrastructure, cross-team collaboration, and in some cases, integration of AI or machine learning pipelines.

We can now assess what we can build with the `wazuh-devenv` project, with the structured approach of DEBMM:

| Domain                 | Status         | How it's Met                                                                 | Next Steps                                 |
|------------------------|----------------|------------------------------------------------------------------------------|--------------------------------------------|
| Process                | Partially Met  | Git workflow supports structure, but backlog and review cadence are manual | Add backlog tracking and agile routines    |
| Expressive Languages   | Not Met        | Wazuh 4.x uses XML; lacks modular or functional constructs. But each rule can be a building block with a parent-child relationship. | Explore templates or adopt Wazuh 5.x later |
| Reusable Components    | Partially Met  | Python tests are modular; rules and decoders reused manually               | Add templates and metadata schemas         |
| Version Control        | Fully Met      | Git is source of truth with branch strategy and reviews                    | Enforce tagging and commit standards       |
| CI/CD + Testing        | Mostly Met     | Local testing and pytest-compatible harness support automation             | Add static linting and rule coverage       |

This puts the project squarely in the **Tier 2 (Intermediate)** category and provides a strong base for growing into Tier 3 and 4 with structured effort. Do you need to jump up to higher levels? It depends on your capabilities and investment.

### Regression Testing as a First-Class Feature

Entropy is inevitable. Whether you consider detections as code or configurations, this does not matter. Every change has the risk to break the system in time. But every test case written in this model becomes part of a living regression suite. When rules are updated or new ones added, all tests are re-executed. This ensures:

- Existing logic isn't broken silently,
- Rule changes are safe and predictable,
- Teams gain confidence before production deployment.

### Deployment Simplicity

This one is debatable. It is easier to update/add/delete the rules from Wazuh dashboard, hit Save, then Restart. But will it work? That's another issue. But at least, when you build your CI/CD pipeline with your tooling -Gitea, GitHub, Gitlab, Bitbucket, Jenkins, etc.- you have an end-to-end secure deployment capability. Once the changes are approved and merged to the `master` or `main` branch, they can be copied to the Wazuh manager and loaded by restarting the service. You can use a pull approach with cron jobs or systemd unit files cloning your repo and then copying files locally on servers, restarting services with bash scripts. Or you can consider a push approach with the Wazuh API in your pipeline to update the rules and decoders.

The Git repo becomes the source of truth.

This simplicity, hopefully, would encourage adoption, reduce long-term operational overhead, and avoid hidden state.

## What's the catch?

Just like any automation project, you pick some repetitive, high effort-low value task and make it "run" by technical means. Now the same task requires a higher level of knowledge and experience than it used to. The people who manages the automation must have higher qualifications than the ones doing the old repetitive task. Now, you need yo train people better. Yes, automation requires investing people more! What a dilemma![^4]

With this approach, you do not only need to know about Wazuh rules, but also a bit of Python, Git and a bit of your internal toolkit. It now requires more effort to learn. Is it worth it? It depends on you environment.

## Conclusion

The [wazuh-devenv](https://github.com/zbalkan/wazuh-devenv) project demonstrates that Detection-as-Code is both achievable and practical —even in XML-based streaming engines like Wazuh 4.x. By combining version control, behavioral testing, and structured workflows, you can safely iterate on detection logic, catch problems before they hit production, track what changed, when, and why. It's a foundational step toward scalable, resilient, and auditable detection engineering.

Future work is the migration paths for Wazuh 5.x's new detection engine. But there's time for that.

This isn't a platform. It's a methodology. And it starts with testing your rules —before they break something important.

---
[^1]: A term coined by [Adrian Sanabria](https://x.com/sawaba) of [Enterprise Security Weekly](https://www.youtube.com/@SecurityWeekly), and I loved it.
[^2]: Check [DataDog](https://www.datadoghq.com/blog/datadog-detection-as-code/)'s and [Elastic](https://www.elastic.co/blog/detections-as-code-elastic-security)'s approaches for DaC. They are great reads. But I cannot recommend [Panther](https://panther.com/blog/modernize-detection-engineering-with-detection-as-code) more in this field. They are the trend setters in this field.
[^3]: For the accidental and essential complexity, please refer to the groundbreaking classic [No Silver Bullet - Essence and Accidents of Software Engineering](https://doi.org/10.1109/MC.1987.1663532)
[^4]: Check the great paper [Ironies of Automation](https://www.sciencedirect.com/science/article/abs/pii/0005109883900468) for great insights. I wrote about this article regarding [a Microsoft leak 2 years ago](https://zaferbalkan.com/ironies-of-automation/).
