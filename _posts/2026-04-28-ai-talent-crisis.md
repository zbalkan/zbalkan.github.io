---
title: "How AI Accelerates the Talent Crisis"
tags:
  - AI
  - Software Engineering
  - Cybersecurity
  - System dynamics
  - Opinion piece
header:
  image: https://live.staticflickr.com/5705/21496317363_eb96849f18_3k.jpg
  caption: "Photo credit: [The domino effect](https://www.flickr.com/photos/testlab/21496317363) by [Kurt:S](https://www.flickr.com/photos/testlab/). [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/deed.en)"
---

If you have spent enough time in software engineering, cybersecurity, IT, or adjacent technical fields, you have likely encountered the familiar joke that companies want a junior with ten years of experience. The joke persists because it reflects something uncomfortably real. Many organizations have long wanted entry-level hires who arrive partially trained, operationally useful from day one, and somehow still available at junior salaries. The economics behind that expectation are obvious enough: training people is expensive, mentoring consumes senior time, and building apprenticeship capacity often slows teams down before it speeds them up. If someone else can absorb those costs first, the individual firm benefits.

None of this is new. The underinvestment in junior talent predates the current AI wave by many years, and most practitioners already understand the problem intuitively. They may not describe it formally, but they recognize the symptoms: unrealistic expectations for junior roles, shrinking entry-level opportunities, inflated "entry-level" requirements, and organizations quietly hoping the labor market will continue producing experienced practitioners they did not have to develop themselves. What AI changes is not the existence of this dynamic, but the economics and intensity of it. If these incentives persist, the trajectory is not encouraging: organizations may preserve short-term output while weakening the apprenticeship pipeline that produces future experienced practitioners.

This is not an attempt to argue that AI has created a new workforce problem, nor is it an attempt to present some novel revelation about technical hiring. The issue is widely recognized. The value in discussing it through system dynamics is narrower and more practical: to describe the structural feedback mechanisms through which AI may accelerate an already familiar problem. Once the feedback structure of a system is understood, its long-term behavior becomes easier to reason about, and the consequences of local optimization become easier to identify before they fully materialize.

## A Systemic Perspective on the Problem

System dynamics studies how systems behave over time based on their internal feedback structures. Rather than analyzing isolated decisions, it examines how decisions interact, reinforce one another, or produce delayed effects elsewhere in the system. One of its core tools is the causal loop diagram, or CLD. A CLD maps variables and the causal relationships between them. A positive relationship means two variables tend to move in the same direction, while a negative relationship means they move in opposite directions. From those relationships emerge feedback loops. Some reinforce change and amplify movement, while others constrain it and stabilize the system. Over time, practitioners of system dynamics observed that certain feedback structures recur across very different domains. These recurring structural patterns are commonly referred to as archetypes. The argument of this article is straightforward: the current AI-driven pressure to reduce junior hiring appears to fit several known archetypes associated with delayed systemic degradation.

Software engineering provides the clearest illustration, but the same logic extends well beyond development. Cybersecurity has analogous apprenticeship paths through SOC analysis, junior detection engineering, operational security roles, and similar early-career positions. The broader issue is therefore not about junior developers specifically, but about the erosion of apprenticeship pipelines in knowledge work more generally.

System dynamics is also concerned with behavior over time, not merely static structure. A system may appear healthy in the short term while accumulating delayed structural weaknesses that only become visible later. That temporal dimension is particularly relevant here, because the core argument of this article is not that AI causes immediate workforce collapse, but that it may strengthen feedback loops whose consequences emerge only after years of compounding effects.

Before discussing the archetypes, it is useful to establish how a causal loop diagram is read. Consider a simple adoption model. As more people adopt a product or idea, adoption may accelerate through word of mouth or network effects. At the same time, the more adoption occurs, the fewer potential adopters remain. One dynamic reinforces growth while the other constrains it.

```mermaid
flowchart LR
    PA["Potential adopters"] -->|+| AR["Adoption rate"]
    AR -->|+| A["Adopters"]
    A -->|+| AR
    A -->|-| PA
```

The purpose of a CLD is not numerical prediction but structural understanding. It helps explain why systems behave as they do by visualizing the feedback mechanisms embedded within them.

These archetypes should not be read as competing explanations for the same phenomenon, nor as mutually exclusive diagnoses from which only one can be "correct." They describe the same system from different analytical angles and at different levels of abstraction. Some operate primarily within firms, some describe market-wide dynamics, and others describe delayed constraints that emerge over time. The value of using multiple archetypes is not to force a single diagnosis, but to examine how overlapping feedback structures may interact.

With that foundation established, we can examine the apprenticeship problem through several common archetypes.

### Tragedy of the Commons

The **Tragedy of the Commons** describes systems where individually rational actions degrade a shared resource. In this case, the shared resource is the industry-wide apprenticeship pipeline. Every organization benefits from experienced practitioners existing in the labor market, but producing experienced practitioners requires someone to hire and train inexperienced ones.

Training juniors is expensive, and avoiding that expense is individually rational. If experienced practitioners become more productive through AI augmentation, the economic case for avoiding junior hiring strengthens further. Each individual firm can conclude that it is more efficient to hire experienced talent later than to develop it internally. No single company intends to degrade the labor market. Yet if enough firms follow the same logic, the market’s future supply of experienced talent declines anyway.

```mermaid
flowchart LR
    COST["Cost of training juniors"] -->|+| AVOID["Avoid junior hiring/training"]
    AVOID -->|+| SAVINGS["Short-term savings"]
    SAVINGS -->|+| AVOID

    AVOID -->|-| PIPE["Industry apprenticeship pipeline"]
    PIPE -->|+| SUPPLY["Future experienced talent supply"]
    SUPPLY -->|-| SCARCITY["Talent scarcity"]
    SCARCITY -->|+| AVOID
```

At the macro level, this may be the central structural problem. The remaining archetypes can be understood as lower-level mechanisms through which this broader market dynamic manifests inside organizations.

### Success to the Successful

The **Success to the Successful** archetype describes systems where competing activities or groups receive unequal resources, causing advantage to compound over time. In this context, the relevant competition is not simply between senior and junior staff, but between investment in senior-augmented execution and investment in junior capability development.

AI tends to benefit experienced practitioners more than inexperienced ones. A senior engineer, analyst, or operator can often use AI effectively because they possess the judgment required to validate output, identify errors, refine prompts, and integrate results into broader context. A junior lacks much of that judgment and therefore cannot leverage the tool in the same way.

As AI increases the productivity of experienced personnel, organizations may place greater trust in their output and allocate more work, tooling, and attention toward senior-augmented execution. The more resources flow in that direction, the fewer remain for structured junior development. The visible gain is immediate productivity. The hidden tradeoff is reduced investment in future capability formation.

```mermaid
flowchart LR
    AI["AI tooling for experienced staff"] -->|+| PROD["Senior-augmented productivity"]
    PROD -->|+| TRUST["Trust in senior-augmented execution"]
    TRUST -->|+| RES["Resources allocated to senior-led delivery"]
    RES -->|+| AI

    RES -->|-| DEV["Resources allocated to junior development"]
    DEV -->|+| GROWTH["Junior capability growth"]
    GROWTH -->|-| DEP["Dependence on current seniors"]
    DEP -->|+| RES
```

### Shifting the Burden

The **Shifting the Burden** archetype appears when organizations rely on symptomatic fixes instead of addressing structural causes. Many firms struggle with junior productivity not because juniors are inherently ineffective, but because their internal systems for developing them are poor. Weak onboarding, inconsistent mentorship, inadequate documentation, poor engineering discipline, and chaotic delivery processes all make junior development harder than it needs to be.

AI itself is not the problem in this model. The issue arises when organizations use AI primarily as a substitute for building the human systems required to develop capability. Rather than improving the environment so less experienced personnel can become productive more quickly, firms can use AI to reduce perceived dependence on juniors altogether. This alleviates immediate delivery pressure while leaving the underlying developmental weakness untouched.

```mermaid
flowchart LR
    PRESS["Delivery pressure"] -->|+| AI["Use AI as substitute for junior capacity"]
    AI -->|+| RELIEF["Short-term delivery relief"]
    RELIEF -->|-| PRESS

    PRESS -->|+| TRAIN["Investment in training and mentorship"]
    TRAIN -->|+| CAP["Human capability development"]
    CAP -->|-| PRESS

    AI -->|-| TRAIN
    AI -->|+| DEP["Dependence on workaround"]
    DEP -->|+| AI
```

### Fixes That Fail

The **Fixes That Fail** archetype describes situations where an intervention solves an immediate problem but creates delayed side effects that worsen the original condition. While **Shifting the Burden** focuses on substitution of a symptomatic solution for a fundamental one, **Fixes That Fail** focuses on the delayed adverse consequences produced by that substitution itself.

In this context, replacing junior capacity with AI-assisted experienced staff may improve short-term throughput and reduce labor costs, but the downstream effects can gradually undermine those gains. As apprenticeship opportunities shrink, fewer practitioners develop into experienced contributors. The resulting skill shortages increase review bottlenecks, reduce institutional depth, and concentrate operational burden on a shrinking pool of senior staff.

```mermaid
flowchart LR
    PROBLEM["Delivery pressure / labor cost pressure"] -->|+| FIX["Reduce junior hiring via AI substitution"]
    FIX -->|+| RELIEF["Short-term throughput / cost relief"]
    RELIEF -->|-| PROBLEM

    FIX -->|-| PIPE["Apprenticeship pipeline strength"]
    PIPE -->|+| TALENT["Future experienced talent availability"]
    TALENT -->|-| BOTTLENECK["Skill bottlenecks / senior overload"]
    BOTTLENECK -->|+| PROBLEM
```

Over time, the organization may find that the intervention intended to improve delivery has weakened the very human capability required to sustain it.

### Growth and Underinvestment

The **Growth and Underinvestment** archetype describes systems where growth or performance improvements are pursued without proportional investment in the capacity required to sustain them. In this context, AI may increase throughput and apparent productivity while masking underinvestment in the infrastructure that develops future practitioners.

Training capacity is not limited to headcount. It depends on mentorship bandwidth, documentation quality, onboarding processes, engineering discipline, and the institutional willingness to allocate experienced staff toward development rather than pure execution. If organizations use AI to expand output without reinvesting part of those gains into apprenticeship infrastructure, they may enjoy short-term performance while gradually eroding the capacity needed to sustain future growth.

```mermaid
flowchart LR
    AI["AI-assisted productivity gains"] -->|+| OUT["Short-term output growth"]
    OUT -->|+| PRESS["Pressure to sustain/increase output"]
    PRESS -->|-| INVEST["Investment in training capacity"]

    INVEST -->|+| CAP["Apprenticeship / mentorship capacity"]
    CAP -->|+| TALENT["Future talent development"]
    TALENT -->|+| OUT
```

### Reflection

None of this is a novel complaint. Most practitioners already understand some version of the problem. They know organizations often want underpaid experience, avoid mentorship overhead, and rely on someone else to produce trained talent. The value of system dynamics is not that it reveals this reality for the first time, but that it explains why the pattern persists despite being widely recognized.

Each individual decision appears rational in isolation. Hiring fewer juniors improves short-term margins. Using AI to augment experienced staff increases immediate output. Expecting candidates to arrive partially trained reduces onboarding costs. The problem emerges when everyone behaves this way inside the same labor ecosystem.

AI does not need to fully replace junior roles for this to matter. It only needs to shift the economics enough to further weaken already-fragile apprenticeship incentives. If that happens, the long-term consequence may not be that AI replaced junior workers outright. It may instead be that the industry consumed more of its future talent-production capacity in exchange for present efficiency.

## Conclusion

The junior talent crisis in technical fields is not new, and AI did not create it. What AI does is strengthen many of the incentives that produced it. This is not a certain forecast, but it is a reasonable projection from the feedback structures: if organizations continue optimizing for present throughput while externalizing the cost of talent development, the apprenticeship pipeline weakens.

That matters because technical capability is not produced instantly. It is accumulated over years through supervised exposure, repetition, failure, correction, and gradual transfer of judgment from experienced practitioners to new ones. Once that pipeline degrades, rebuilding it is neither quick nor cheap. By the time the shortage becomes visible enough for everyone to acknowledge, the corrective actions may take years to bear fruit.

The most dangerous systemic failures are often not caused by dramatic disruption, but by slow erosion of the processes that quietly sustain the system. If AI is used primarily to remove the need to train the next generation, then the industry may discover too late that it optimized away part of the mechanism that produces future expertise.
