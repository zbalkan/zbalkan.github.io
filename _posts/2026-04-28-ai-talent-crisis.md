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

If you have spent enough time in software engineering, cybersecurity, IT, or adjacent technical fields, you have likely heard the familiar joke that companies want a junior with ten years of experience. The joke survives because it reflects something real. Many organizations have long wanted entry-level hires who arrive partially trained, useful from day one, and still cheap enough to classify as junior. The economics are obvious enough: training people costs money, mentoring consumes senior time, and building apprenticeship capacity usually slows teams down before it speeds them up. If someone else can absorb those costs first, the individual firm benefits.

None of this is new. The underinvestment in junior talent predates the current AI wave by many years, and most practitioners already understand the pattern intuitively. They may not describe it formally, but they recognize the symptoms: unrealistic requirements for junior roles, shrinking entry-level opportunities, inflated “entry-level” expectations, and organizations quietly hoping the labor market will keep producing experienced practitioners they did not have to develop themselves.

What AI changes is not the existence of this dynamic, but the economics and intensity of it.

A significant portion of the post-2022 contraction is more plausibly explained by pandemic-era overhiring, macroeconomic tightening, and general normalization after an unusually expansionary labor market. Broad IT employment data does not support the claim that AI has already caused a general collapse in technical employment. But aggregate employment can remain stable while the underlying structure deteriorates. A system may look healthy in headline numbers while the composition of hiring shifts in ways that weaken its future.

The claim is narrower: current incentives, now amplified by AI, risk further degrading the apprenticeship pipeline over time.

Some labor-market signals point in that direction. [Indeed Hiring Lab](https://www.hiringlab.org/2025/07/30/experience-requirements-have-tightened-amid-the-tech-hiring-freeze/) found that senior and manager-level tech postings were down 19% from pre-pandemic levels in early 2025, while standard and junior titles were down 34%, and the share of tech postings requiring at least five years of experience rose from 37% to 42% between Q2 2022 and Q2 2025. [SignalFire’s 2025 State of Tech Talent Report](https://www.signalfire.com/blog/signalfire-state-of-talent-report-2025) reports that new-graduate hiring at Big Tech has fallen by more than 50% from 2019 levels, with new graduates now accounting for only 7% of hires. [Lightcast’s Q2 2024 Cybersecurity Talent Report](https://lightcast.io/resources/research/quarterly-cybersecurity-talent-report-june-24) shows a similar “hollow middle” pattern in cybersecurity: surplus at the entry level, shortages in the mid-career band. None of this proves an inevitable future shortage. It does suggest that the pipeline is becoming more fragile.

The pattern is well known; the value here is making its feedback structure explicit.

## A Systemic Perspective on the Problem

System dynamics focuses on how feedback loops shape behaviour over time. The useful abstraction here is not the diagram itself but what it exposes: local optimisation decisions interacting to produce delayed, system-level effects. The same structure appears across domains, and the patterns below map that structure onto technical hiring.

Software engineering provides the clearest illustration, but the same logic extends well beyond development. Cybersecurity has analogous apprenticeship paths through SOC analysis, junior detection engineering, operational security roles, and similar early-career positions. The broader issue is therefore not about junior developers specifically. It is about the erosion of apprenticeship pipelines in knowledge work more generally.

System behaviour over time matters here. The concern is not immediate collapse but the strengthening of feedback loops whose effects emerge only after years of compounding.

Consider a simple adoption model. As more people adopt a product or idea, adoption may accelerate through word of mouth or network effects. At the same time, the more adoption occurs, the fewer potential adopters remain.

```mermaid
flowchart LR
    PA["Potential adopters"] -->|+| AR["Adoption rate"]
    AR -->|+| A["Adopters"]
    A -->|+| AR
    A -->|-| PA
```

These archetypes describe the same system at different levels: firm-level decisions, market dynamics, and delayed constraints.

### Tragedy of the Commons

The **Tragedy of the Commons** describes systems where individually rational actions degrade a shared resource. In this case, the shared resource is the industry-wide apprenticeship pipeline. Every organization benefits from experienced practitioners existing in the labor market, but producing experienced practitioners requires someone to hire and train inexperienced ones.

Training juniors is expensive, and avoiding that expense is individually rational. If AI increases the leverage of already-experienced personnel, the economic case for avoiding junior hiring strengthens further. Each firm can conclude that it is more efficient to buy talent later than to develop it internally. No single company intends to degrade the labor market. Yet if enough firms behave that way, the future supply of experienced talent declines anyway.

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

At the macro level, this is the central structural problem. The remaining archetypes describe how it manifests inside organizations.

### Success to the Successful

The **Success to the Successful** archetype describes systems where competing activities receive unequal resources, causing advantage to compound over time. Here, the relevant competition is between investment in senior-augmented execution and investment in junior capability development.

Some AI productivity studies suggest less-experienced workers can benefit substantially from AI assistance when given access and support. [Brynjolfsson, Li, and Raymond](https://www.nber.org/papers/w31161), for example, found novice workers benefited more from AI assistance than experienced ones in customer support. Organizations, however, allocate resources based on trust, perceived execution certainty, and risk tolerance.

As AI increases the leverage of already-trusted senior staff, organizations direct more work, tooling, and budget toward senior-augmented execution. The more resources flow in that direction, the fewer remain for structured junior development.

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

The **Shifting the Burden** archetype appears when organizations rely on symptomatic fixes instead of addressing structural causes.

Many firms struggle with junior productivity not because juniors are inherently ineffective, but because their internal systems for developing them are weak. Poor onboarding, inconsistent mentorship, inadequate documentation, and weak engineering discipline all make capability development harder than it needs to be.

AI is not the problem here. The issue arises when organizations use AI as a substitute for building the human systems required to develop capability.

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

The **Fixes That Fail** archetype describes interventions that solve an immediate problem while creating delayed side effects that worsen the original condition.

Replacing junior capacity with AI-assisted experienced staff may improve short-term throughput and reduce labor costs, but the downstream effects gradually undermine those gains. As apprenticeship opportunities shrink, fewer practitioners develop into experienced contributors. The resulting shortages increase review bottlenecks, reduce institutional depth, and concentrate operational burden on a shrinking pool of senior staff.

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

### Growth and Underinvestment

The **Growth and Underinvestment** archetype describes systems where performance improvements are pursued without proportional investment in the capacity required to sustain them.

Training capacity is not merely headcount. It depends on mentorship bandwidth, documentation quality, onboarding processes, and engineering discipline. If organizations use AI to expand output without reinvesting part of those gains into apprenticeship infrastructure, they may achieve short-term performance while eroding the capacity needed to sustain it.

```mermaid
flowchart LR
    AI["AI-assisted productivity gains"] -->|+| OUT["Short-term output growth"]
    OUT -->|+| PRESS["Pressure to sustain/increase output"]
    PRESS -->|-| INVEST["Investment in training capacity"]

    INVEST -->|+| CAP["Apprenticeship / mentorship capacity"]
    CAP -->|+| TALENT["Future talent development"]
    TALENT -->|+| OUT
```

## Reflection

Practitioners already recognise the pattern. What tends to be missing is an explicit model of how individually rational decisions accumulate into systemic degradation.

Each individual decision appears rational in isolation. Hiring fewer juniors improves short-term margins. Using AI to augment experienced staff increases immediate output. Expecting candidates to arrive partially trained reduces onboarding costs. The problem emerges when everyone behaves this way inside the same labor ecosystem.

AI does not need to replace junior roles outright. It only needs to shift the economics enough to further weaken already-fragile apprenticeship incentives. The likely outcome is not immediate displacement, but reduced formation of future expertise.

The quieter risk is that this erosion remains mostly invisible while it is happening. Organizations may continue meeting delivery targets for years, especially while drawing from talent developed under earlier market conditions. Structural degradation often becomes obvious only after the pipeline has already weakened.

## Conclusion

The junior talent crisis in technical fields is not new, and AI did not create it. AI strengthens many of the incentives that produced it.

If organizations continue optimizing for present throughput while externalizing the cost of talent development, the apprenticeship pipeline weakens.

Technical capability is not produced instantly. It accumulates over years through supervised exposure, repetition, failure, correction, and gradual transfer of judgment from experienced practitioners to new ones. Once that pipeline degrades, rebuilding it is neither quick nor cheap.

The most dangerous systemic failures are often not dramatic. They emerge through slow erosion of the processes that sustain the system. If AI is used primarily to reduce training, the industry risks optimizing away part of the mechanism that produces future expertise.
