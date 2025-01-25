---
title: "Back to Basics 1: The Microsoft Leak and the Ironies of Automation"
tags:
  - Security
  - Complexity
  - Human aspects
redirect_from: /2023/09/19/ironies-of-automation.html
---

The recent Microsoft data leak, involving [over 38TB of private data exposed due to the misuse of Account SAS tokens](https://www.wiz.io/blog/38-terabytes-of-private-data-accidentally-exposed-by-microsoft-ai-researchers), has sent shockwaves (!) through the cybersecurity community. While the incident itself is alarming, it also serves as a stark reminder of the inherent risks associated with automation and abstraction in cloud computing. This article aims to explore the parallels between this incident and the seminal work "Ironies of Automation" by Lisanne Bainbridge, shedding light on the vulnerabilities that can arise when we overly rely on automated systems.

<!--more-->

## The Microsoft Leak: A Brief Overview

The leak occurred when Account SAS tokens were used as a sharing mechanism for an AI dataset. These tokens, which are notoriously hard to track and can be configured to last indefinitely, were committed to GitHub. The lack of monitoring and governance turned this simple act of sharing into a major security incident. Microsoft has since invalidated the token and completed an internal investigation, but the damage was done.

As mentioned in the Wiz article as well, ["Creating a SAS token" is also a persistence method](https://www.microsoft.com/en-us/security/blog/2023/09/07/cloud-storage-security-whats-new-in-the-threat-matrix/#:~:text=Create%20SAS%20Token) according to the Microsoft Cloud Threat Matrix, in case attackers create a "high-privileged SAS token with long expiry to preserve valid credentials for a long period". That is a threat as SAS tokens are simple to create and relatively hard to monitor and manage. It is just another key management problem, but the practices and processes around it have not matured enough.

## Ironies of Automation: A Summary

I would like to mention an article under the "Back to basics in IT" category in my library, which also motivated me to start a blog series. Published in 1983, Lisanne Bainbridge's "Ironies of Automation" is a cornerstone in the field of human-computer interaction. It is one of the first studies that addresses on human aspect of IT. The article outlines several paradoxes that arise from automation:

* **Skill Degradation:** Automation can lead to operators losing proficiency in tasks they are most needed for, as they become disengaged.
* **Complexity in Crisis:** Automated systems often handle routine tasks well but leave operators to deal with complex or unexpected situations, for which they may be unprepared.

* **Loss of Situational Awareness:** Over-reliance on automation can result in "out-of-the-loop" syndrome, where operators lose awareness of the system state.

* **Increased Workload:** Ironically, automation can sometimes increase the workload for human operators, especially when they have to intervene or correct automated systems.

* **Human Error:** Automation can introduce new types of human errors, particularly when operators interact with automated systems in unexpected ways.

* **Design Challenges:** Designing automated systems that effectively support human operators is a complex task that requires understanding both technical and human factors.

* **Training and Adaptation:** Operators need specialized training to work effectively with automated systems, including how to handle failures and unexpected events.

* **Ethical and Legal Concerns:** Automation raises questions about responsibility and accountability, especially in high-stakes environments.

In sum, the more automation the more human involvement, by means of quality and quantity. What an irony!

## Can you see the irony in the leak?

Well, until this point the gist has been taken, I believe. But I want to state the obvious take: Cloud is yet another abstraction, which has been tremendously successful at adding layers of automation beneath the fancy cover. Just like Lisanne Bainbridge covered 30 years ago, the incident is just another call to human aspects of IT and cybersecurity, reminding us the speed of automation is too much for the "operators" to catch up.

I can see some parallels. I may be mistaken or missing important points, yet I would like to jot down my take.

### Complexity in Crisis

The Microsoft leak showcased how the complexity of underlying automated systems can make it difficult for human operators to quickly identify and rectify issues, especially during a crisis.

### Loss of Situational Awareness

The abstraction provided by the cloud can lead to a lack of visibility into critical details. In the Microsoft case, this manifested as a lack of oversight over how SAS tokens were being used or managed.

### Human Error

The ease of use of cloud services can sometimes lead to complacency, resulting in human errors like misconfiguration or improper token management, as was the case in the Microsoft leak.

### Design Challenges

One of the most significant hurdles in automation is designing systems that are both technically sound and user-friendly. The Microsoft leak serves as a case study of the pitfalls of design that don't adequately consider the end-user. Automated systems must be intuitive enough for operators to manage effectively, especially during crisis situations. This requires a deep understanding of both the technical aspects of the system and the human factors involved in its operation. Here, the AI researchers, do not have to deal with key management procedures yet they are in it. The design of this process looks broken compared to the highly complicated infrastructure behind it. The system should not let a user put the keys in an insecure location in the first place. `Security-by-design` is a significant idea that we cannot see the implementations in the wild.

### Training and Adaptation

The Microsoft incident highlights the need for specialized training for operators who interact with automated systems. Such training should not only cover routine operations but also how to handle system failures and unexpected events. In the absence of such training, even seasoned operators can find themselves ill-equipped to manage crises, leading to incidents like the Microsoft leak. While I believe the goal is creating smooth user experiences in products that will not require user training, in complex environments like these, proper training may be needed.

## What's your take?

I tried to explain and used a great resource to draw parallels with an incident. Let me summarize my two cents:

The Microsoft data leak serves as a cautionary tale that underscores the need for a balanced approach to automation and human oversight. As we continue to embrace the conveniences of cloud computing and automation, it's crucial to remain vigilant about the associated risks. This incident serves as a practical example of the principles outlined in "Ironies of Automation," emphasizing the need for human aspects of automation to be understood, and reminded often in the context of IT and cybersecurity.

I suggest people around me to go back to basics to solve the complex problems. Many of those problems are already solved by great minds, years or even decades ago. Most of the time, the same problems just reappear in the same or similar forms, because it is a human problem, not a technology problem. Dear Lisanne Bainbridge's "Ironies of Automation" is one of those basics every person in IT and cybersecurity needs to read, again and again. And if you like, you can read her newer works from [her blog](https://www.complexcognition.co.uk/) too!

Now, **what is your take** on the nature of these leaks?
