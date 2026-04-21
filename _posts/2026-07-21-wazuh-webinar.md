---
title: "Wazuh webinar: From Rule to Reality - Detection-as-Code in Action with Wazuh"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Detection Engineering
  - Testing
  - Detection-as-Code
  - Quality Assurance
  - Webinar

---

On 11 February 2026, I gave a webinar for [Wazuh](https://wazuh.com/?utm_source=ambassadors&utm_medium=referral&utm_campaign=ambassadors+program) together with another [Wazuh ambassador](https://wazuh.com/ambassadors-program/utm_source=ambassadors&utm_medium=referral&utm_campaign=ambassadors+program) [Kevin Branch](https://www.linkedin.com/in/bluewolfninja?utm_source=share_via&utm_content=profile&utm_medium=member_android): [**From Rule to Reality: Detection as Code in Action with Wazuh**](https://wazuh.com/events-webinars/). It was the first webinar in the planned series, and more than 120 people joined the session. That was encouraging, but the more important part was the level of interest in the subject itself. Detection engineering clearly resonates with practitioners who want something more rigorous than writing rules and hoping for the best.

The main point of the webinar was simple: A detection is not "engineering" merely because it produces an alert. It becomes engineering when it is treated as a maintainable artifact: versioned, tested, reviewed, and improved over time. That sounds obvious when stated that way, but in practice many teams still treat detections as isolated logic fragments. A rule fires, maybe gets tuned once or twice, and then quietly turns into legacy content. Over time, that creates a ruleset nobody fully trusts.

This is also why I keep returning to the phrase *detection as code*. It is not branding. It is a reminder that detections live in the same world as the rest of engineering. They break when assumptions change. They accumulate technical debt. They need regression testing. They need structure. If a team cannot explain why a rule exists, how it should behave, and how changes are validated, then the problem is usually not with the platform. The problem is a missing engineering discipline around detection content.

Wazuh is a good place to have that discussion because it makes the mechanics visible. Once you work with real rules, real telemetry, and real operational trade-offs, vague advice becomes less useful. You have to think about rule relationships, event quality, false positives, performance, and maintenance cost. That is where the conversation becomes more honest. It stops being "how do I write a rule?" and becomes "how do I build a detection that survives contact with reality?"

Kevin Branch's participation also mattered. His work in the community has been useful for many practitioners, including me. In open-source ecosystems, that kind of contribution often fills the gap between official documentation and operational understanding. A lot of practical knowledge lives there. I have learned so much from [Kevin's Github repositories](https://github.com/branchnetconsulting). I am also grateful to the Wazuh team for the opportunity and support around the webinar.

If you missed the live session, the recording is available here: [**YouTube recording**](https://youtu.be/EDWNlruUdMo?is=fHR00zQ0PFC82-Le). I also shared the repository demonstrated in the webinar: [**GitHub repository**](https://github.com/zbalkan/wazuh-devenv). My hope is that the useful part is not the webinar itself, but what people do with the ideas afterward. If it helps a few teams treat detections less like one-off content and more like systems that can be engineered, tested, and improved, that is enough.

On a final note, please check the [events calendar](https://wazuh.com/events-calendar/) to see if something matches your interest, language and timezone. 
## Related links

- [Wazuh webinar page](https://wazuh.com/events-webinars/)
- [YouTube recording](https://youtu.be/EDWNlruUdMo?is=fHR00zQ0PFC82-Le)
- [wazuh-devenv repository](https://github.com/zbalkan/wazuh-devenv)
- [My Detection as Code article](https://zaferbalkan.com/detection-engineering/)
- [My Wazuh development environment article](https://zaferbalkan.com/wazuh-devenv/)
- [My article on log replay for behavioral testing](https://zaferbalkan.com/log-replay/)
