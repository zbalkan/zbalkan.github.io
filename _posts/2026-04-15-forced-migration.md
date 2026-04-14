---
title: "The Economics of Forced Mitigation"
tags:
  - AI
  - Cybersecurity
  - Vulnerability management
  - Opinion piece
---

## A Familiar Pattern

Security discussions tend to follow a familiar pattern where a new capability is introduced, framed as a step change, and quickly followed by a narrative of urgency in which attackers are expected to move faster, defenders are assumed to fall behind, and organizations are told that everything must change. The Mythos narrative fits this pattern closely, and the Cloud Security Alliance explicitly states that AI has materially accelerated vulnerability discovery beyond current defensive operating capacity and requires immediate operational changes ([CSA MythosReady](https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/04/mythosready.pdf), [CSA CISO Briefing](https://labs.cloudsecurityalliance.org/mythos-ciso/)), which is factually correct, yet still incomplete as an explanation of what is actually happening.

There is no public evidence showing that APT groups or criminal operators are running fully autonomous, end-to-end AI-driven attack pipelines at scale, and the distinction between controlled evaluation and operational deployment still holds, although it is narrowing and increasingly defined by access and governance rather than technical feasibility. The CSA itself makes this distinction by stating that AI augments offensive workflows rather than replaces operators ([CSA AI Offensive Security Report](https://cloudsecurityalliance.org/press-releases/2024/08/07/cloud-security-alliance-addresses-using-ai-for-offensive-security-in-new-report)), and therefore the meaningful change is not autonomy but scale, because acceleration of specific stages is sufficient to alter the system without requiring full automation.

## Amplification Over Autonomy

AI reduces the cost of performing vulnerability research and exploit development tasks, yet it does not eliminate the need for those tasks, and this distinction is critical because the CSA material shows both sides at once: large-scale vulnerability identification across codebases and assistance in exploit construction, combined with continued reliance on human validation, environmental context, and execution decisions ([CSA MythosReady](https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/04/mythosready.pdf)). This combination does not produce autonomous attackers, but it does produce more capable ones, and more importantly, it produces more of them.

As the cost of capability decreases, the distribution changes, and a larger population can now perform meaningful vulnerability research and produce working proofs of concept, which is enough to shift the operating environment even if individual sophistication does not increase significantly. Security operations were designed around a smaller and slower adversary population, and once that assumption breaks, the system is exposed not because attackers became exceptional, but because many more actors now operate at a level that existing processes cannot absorb.

## Time Was a Control

Security systems have historically relied on time as one of several implicit controls, alongside segmentation, privilege boundaries, exploit mitigations, and detection engineering, since triage, reproduction, prioritization, and patching all require delay, and vendors, product teams, and security functions have built processes that assume that delay exists and can be managed. The CSA explicitly states that AI-driven discovery is now outpacing remediation capacity ([CSA CISO Briefing](https://labs.cloudsecurityalliance.org/mythos-ciso/)), while external threat intelligence shows the same trend, with exploitation timelines shrinking and attackers moving quickly after disclosure ([Google Threat Intelligence](https://cloud.google.com/blog/topics/threat-intelligence/time-to-exploit-trends-2023), [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)).

Once this temporal buffer is reduced, the system no longer operates within its previous assumptions, and the constraint shifts more visibly toward response capacity rather than discovery difficulty, which is why describing this change as a faster feedback loop understates the impact. In practice, many organizations did not have uniformly effective remediation systems but relied partly on delay and process visibility, and when that delay is compressed, the underlying limitations become more apparent.

## The Economics That Produce the Risk

The CSA states that this shift is systemic and not tied to a specific model or vendor ([CSA CISO Briefing](https://labs.cloudsecurityalliance.org/mythos-ciso/)), and this statement suggests—though does not by itself prove—that the cause is also systemic. The economic structure around GenAI provides a plausible explanation, where capability is funded, scaled, and distributed rapidly, access is intentionally broad, and the same infrastructure is shared across use cases without differentiation between defensive and offensive applications.

Under these conditions, attackers and defenders operate on largely the same substrate, and lowering the cost of capability increases usage across the board, which in turn increases vulnerability discovery and expands exploitable surface, while also driving demand for additional tooling built on the same platforms. This feedback loop is consistent with observed patterns in other dual-use ecosystems such as cloud infrastructure and open-source tooling, although the scale and speed may differ.

## From Avoidance to Forced Mitigation

From a risk management perspective, avoidance would mean limiting or rejecting a capability that introduces systemic risk, yet in this case that option appears increasingly impractical because capability has already diffused across APIs, open models, development workflows, and security tooling. The CSA report reflects this reality by proposing operational adaptation—faster patching, improved asset visibility, and tighter remediation pipelines—rather than avoidance ([CSA MythosReady](https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/04/mythosready.pdf)).

This does not necessarily prove that mitigation is the only possible strategy in principle, but it does indicate that, under current market and technological conditions, mitigation is the dominant and most actionable response available to most organizations.

## Operational Guidance, Not Root Cause

The CSA report operates at the defensive layer and assumes continued capability growth, attacker access, and persistent exposure, and within those assumptions it provides practical and necessary guidance for organizations attempting to maintain control over their environments. However, it does not address the source of the risk, because that source lies outside the operational layer in the economic and technological conditions that drive capability expansion and distribution.

This distinction matters because it separates what can be controlled operationally from what is shaped by broader system dynamics, and while operational improvements can reduce impact, they do not directly alter those underlying conditions.

## Throughput Over Robustness

There is an expectation that increased pressure will lead to better engineering outcomes, based on the assumption that faster discovery will force faster and higher-quality fixes, yet this assumes that the system is optimizing for robustness rather than output. The CSA notes that AI increases speed and scalability in both offensive and defensive workflows ([CSA AI Offensive Security Report](https://cloudsecurityalliance.org/press-releases/2024/08/07/cloud-security-alliance-addresses-using-ai-for-offensive-security-in-new-report)), which confirms the increase in throughput but does not, by itself, establish an improvement or degradation in quality.

It is therefore more accurate to treat the expectation of declining quality as a hypothesis grounded in known engineering trade-offs, rather than as an empirically demonstrated outcome in this context.

## What This Actually Means

The CSA position is directionally correct, since vulnerability discovery is accelerating, exposure is increasing, and security teams must adapt their operations accordingly, yet the root cause is not necessarily the model itself but more broadly the incentive structure and deployment model that drive capability expansion and distribution. The report provides the operational response required under these conditions, and while that response is necessary, it does not fully address the conditions that produce the risk.

This leaves a system where capability growth is expected, risk growth is tolerated, and mitigation is delegated to those operating within the system, and if time previously acted as one of several controls, then its reduction represents a meaningful shift, with many of the observed effects following from that change.
