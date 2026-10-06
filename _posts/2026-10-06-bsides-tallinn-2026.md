---
title: "Detection in Technicolour at BSides Tallinn 2026"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Detection Engineering
  - Testing
  - Detection-as-Code
  - Quality Assurance
  - Community Contribution
  - Presentation
  - BSides
---

On September 25, I spoke at [BSides Tallinn 2026](https://tallinn.bsides.ee). My talk was *Detection in Technicolour: Finding the Gaps Your Dashboard Cannot See*[^1], and the organisers have put the [recording on YouTube](https://youtu.be/kpjNKX6p8Qg). I opened with an apology: my slides had no cat pictures, no AI and very few buzzwords, and I was about to spend forty minutes on logs.

The idea came from a chat with friends who work in IT and security. Their organisation had an incident, and nobody saw the attack until afterwards, even though the SIEM and EDR were deployed. They had enabled Security event 4688 for process creation but had not turned on command-line logging with it. The security team assumed command-line logging was already on, and no one had asked the system administrators. The change takes about two minutes in Group Policy once the ticket is through, and without it the logs they needed during the incident were never written. I don't think anyone there did a bad job. Each team did its own work well, and the gap sat in what the teams had not told each other.

Because of that story, I started with a rule that hasn't fired in a year. That fact tells you very little on its own, because either nothing happened or the logs the rule needs never arrive. Most teams I know have no check that tells the two apart. I then walked through a simple security data pipeline and the places it breaks. Logs can be generated but not collected, or collected but left unparsed for want of a couple of regexes. They can also arrive in such volume that they choke everything downstream. I learnt the last one first-hand, after enabling everything on our on-premises Kubernetes environment in one big-bang change. That change produced around 12 million events a day, over 99% of it noise. Until I filtered the noise out, the buffers along the way were full, and we very likely lost events that mattered. On a quota-based licence, the same mistake would have used up the day's allowance in about an hour and a half and left us blind for the rest of the day. The dashboards for agents, ingestion, storage and rules can stay green through all of this. I didn't want to call that security theatre, because no one does it on purpose. I called it a security illusion instead, where we trust our tools a little more than we should.

I ran both demos on Wazuh, partly because it is the platform I know best. It is also free and open source, so the audience did not have to sit through a product pitch. The demos were the only Wazuh-specific part. The rest of the talk applies to any security data pipeline, whether it runs on a commercial SIEM, a SaaS platform or something a team built in-house. Almost all of these let you replay logs against your rules in some form. I hadn't sacrificed anything to the demo gods, but both demos worked. In the first, I replayed about 550 logs from a known attack chain with a small Python project I built for my own environment. The default ruleset did not raise a single alert at level 12 or above. The attack used a signed Microsoft binary running as SYSTEM from a user-controlled path. I wrote a rule for that behaviour, mapped it to ATT&CK, reloaded the rules and watched the test pass. The rules live in Git, so my teammates can see each change and the reason behind it.

For the second demo, I ran a CLI tool over archived logs. I had turned it from a personal script into a proper tool just before the conference. It groups the events into patterns and shows where each pattern stops. In the lab data, most events matched only rules below the alert threshold. One of those events was the payload editing a registry key, which Wazuh flagged at such a low level that it never reached the dashboard.

I ended with four questions for Monday morning: what required telemetry are you missing, where does processing fail, which collected telemetry has no known consumer, and is it valuable enough to keep. If the talk turned a few of your unknown unknowns into known unknowns, measuring them in your own environment is how they become known.

Thanks to the BSides Tallinn organisers and volunteers, and to everyone who sat through forty minutes about logs without a single cat picture.

[^1]: I meant the brand, Technicolor, and misspelt it in my CFP submission. Once the talk was accepted under that title, I felt I had to stick with it on the slides and on stage.
