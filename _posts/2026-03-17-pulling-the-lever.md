---
title: "Pulling the Lever"
tags:
  - Security
  - Human aspects
  - Critical thinking
  - Opinion piece
  - Vibe coding
  - AI-generated code
  - SDLC
  - Shadow IT
---

Walk through a casino and you will see rows of slot machines. Someone sits down, pulls the lever, watches the reels spin, and waits for the result. Most of the time nothing happens. Occasionally a small win appears. Rarely, the machine pays out. If the outcome is disappointing, the response is simple: pull the lever again.

Working with AI development tools can sometimes resemble this pattern more than many engineers are comfortable admitting. A prompt produces code, a design suggestion, or a configuration. The output might be close to what was intended, or it might miss the mark entirely. When that happens, the natural reaction is to adjust the prompt and try again. After several attempts, something that appears workable often emerges. At a superficial level, this resembles productivity. Iteration accelerates, output increases, and systems appear faster to build. Yet software engineering has never been evaluated by whether a system can eventually be generated. The discipline emerged because engineers learned that systems which merely appear to work often fail once they encounter real operating conditions. The central question has always been whether a system behaves predictably under constraints and whether other teams can depend on it once it becomes part of a larger environment. Understanding that distinction matters when discussing AI-assisted development.

Below is a diagram for what I have observed with some vibe coders:

```mermaid
flowchart LR
    A[Idea / Problem] --> B[Prompt AI]

    B --> C[AI Generates Code]
    C --> D[Quick Run / Demo]

    D --> E{Works?}

    E -- No --> F[Tweak Prompt]
    F --> B

    E -- Kind of --> G[Patch by Prompt]
    G --> B

    E -- Looks OK --> H[Ship to Production]

    H --> I[Users Find Problems]
    I --> J[Prompt AI Again]

    J --> B
```

## Some History

Much of the current excitement around AI-assisted development centers on speed. Code generation is faster, design alternatives can be explored quickly, and prototypes can appear with far less manual effort than before. These capabilities are real, and in many cases they are genuinely useful. Where the discussion becomes more complicated is when speed begins to be interpreted as evidence that earlier engineering practices are becoming unnecessary. It is increasingly common to hear claims that the traditional development lifecycle is collapsing, that stages such as design and testing can be compressed into a single loop of generation and validation, or that structured development processes belong to a slower era of software development. This interpretation overlooks why those practices appeared. The Software Development Lifecycle did not emerge because engineers preferred process to creativity. It emerged because software projects repeatedly failed when development relied primarily on iteration and intuition.

Early software systems were comparatively small and operated in tightly controlled environments. Programs were often written by the same people who ran them, and informal practices were usually sufficient because the consequences of failure were limited. That situation changed during the 1960s as organizations began commissioning systems whose complexity exceeded the methods used to build them. Systems grew larger, dependencies multiplied, and failures became more costly. Projects ran over budget, schedules slipped, and deployed systems sometimes failed in ways that were difficult to correct. These patterns became widely known as the software crisis. The response was not simply to write code more quickly. Engineers began introducing structure into how systems were specified, designed, verified, and deployed. Over time those practices evolved into what we now describe as the Software Development Lifecycle. Seen from this perspective, the SDLC is less a rigid sequence of stages and more an accumulation of lessons about how complex systems fail.

## Why the SDLC Exists

The SDLC did not emerge fully formed as a predefined framework. It developed gradually as engineers discovered which practices prevented particular classes of failure. Requirements practices appeared because teams were building systems that did not match the needs they were supposed to solve. Architecture reviews emerged because structural design mistakes were expensive to correct once implementation had begun. Testing became formalized because defects discovered in production were disruptive and costly. Change and release controls appeared because uncontrolled updates could destabilize operational systems. Monitoring eventually became essential because even well-tested systems behave differently once they encounter real environments.

Viewed this way, the SDLC is not simply a workflow. It is a collection of controls that exist because particular risks occur often enough to justify preventing them. Modern governance frameworks follow a similar logic. NIST’s Risk Management Framework integrates risk considerations directly into the system lifecycle, and COBIT approaches enterprise IT governance as the coordination of objectives, resources, and risk. The principle behind both is straightforward: technology risk does not disappear simply because systems become easier to build.

Ob the other hand, AI-assisted development clearly changes how software can be produced. It reduces the effort required to generate code, helps developers explore alternative approaches quickly, and allows teams to move from idea to prototype much faster than before. What it does not change are the underlying risks.

Systems can still be built against incorrect requirements. Architectures can still fail under real workloads. Implementations can still contain vulnerabilities. Deployments can still disrupt production environments. Systems can still become difficult to maintain. Those risks existed before AI and they remain today. If the risks remain, the need for controls remains as well.

This leads to a simple observation. Controls exist because certain failures occur often enough to justify preventing them. If the risk of misunderstanding requirements still exists, then requirements governance must exist. If architecture can still be flawed, then design review must exist. If code can still contain defects, verification must exist. If deployment can still disrupt operations, change management must exist. Removing a control while the underlying risk remains does not eliminate the risk. It simply makes the system harder to govern.

Looking at the lifecycle through the lens of risk control clarifies the situation.

| SDLC Control Area | Risk Mitigated | Status in AI Development | Concern |
| --- | --- | --- | --- |
| Requirements governance | Building the wrong system | Still exists | AI can implement unclear requirements quickly |
| Requirements traceability | Weak linkage between need and implementation | Still exists | Generated artifacts may lack traceability |
| Architecture review | Structural design flaws | Still exists | Pattern-based designs may ignore real constraints |
| Secure design review | Insecure trust boundaries | Still exists | Generated designs may repeat insecure patterns |
| Secure implementation | Coding vulnerabilities | Still exists | AI-generated code may include known flaws |
| Static analysis | Undetected defects | Still exists | Code volume may exceed review capacity |
| Dependency governance | Supply-chain risk | Still exists | Generated solutions may introduce unknown dependencies |
| Testing and verification | Functional defects | Still exists | Generated tests may mirror code assumptions |
| Independent verification | Correlated validation failure | Often weaker | Code and tests may originate from the same model |
| Code review | Unsafe changes | Still exists | Developers may not fully understand generated code |
| Release management | Operational instability | Still exists | Faster generation increases deployment pressure |
| Monitoring | Undetected failures | Still exists | Higher change velocity increases reliance on detection |

AI lowers the cost of producing software. It does not lower the complexity of operating it.

Another issue involves assurance. Traditional lifecycle practices produce evidence: traceability between requirements and tests, review records, design decisions, and defect metrics. These artifacts allow organizations to reason about whether a system has been properly validated. Many AI-assisted workflows do not yet produce equivalent evidence consistently.

A system may be described as automatically tested or agent-verified, but those descriptions rarely explain what was actually tested, how complete the coverage is, or whether the validation process was independent of the generation process.

The issue is not that AI-generated systems cannot work. The issue is that quality becomes harder to measure when development accelerates while assurance evidence becomes thinner.

It is also important to remember that the SDLC represents only one part of the broader product lifecycle. Once software is deployed, its consequences are usually carried by other teams. Operations must keep it running. Security teams must defend it. Platform teams must support dependencies. Audit and compliance teams may need to review its controls. Business teams ultimately depend on the system functioning correctly.

Low-quality software rarely remains a local problem. A fragile system shifts effort outward to the rest of the organization. Development may appear faster, but the operational cost often appears later. Few organizations have time to run their business on software that only works well enough to demonstrate a concept.

AI development tools also reduce the barrier for creating systems outside formal governance structures. Organizations have always struggled with shadow IT because teams will build solutions when official processes move too slowly. AI simply makes that easier. Applications, integrations, and automations can now be assembled quickly with minimal effort.

Some of those systems will solve legitimate problems. Others will quietly accumulate risk. Systems built outside governance often lack clear ownership, consistent security controls, and reliable documentation. Over time this produces environments that are difficult to secure, difficult to audit, and difficult to recover when failures occur.

Monitoring and observability remain essential in modern systems. They help detect problems quickly and support incident response. But monitoring is reactive. It tells you that something has already started to fail. Preventive controls earlier in the lifecycle-design validation, testing, and controlled release-exist because preventing failures is usually far less costly than recovering from them.

Monitoring complements those controls. It does not replace them.

## A suggestion

In my humble opinion, there is a middle ground: don't ignore the lessons learned throughout the decades.

```mermaid
flowchart LR
  A[Problem / Idea] --> B[Prompting / AI Generation]
  B --> C[Draft Artifacts<br/>Code / Design / Config]
  C --> D[Human Review]
  D --> E{Acceptable?}

  E -- No --> F[Refine Prompt / Constraints]
  F --> B

  E -- Yes --> G[Implementation / Integration]
  G --> H[Verification<br/>Build / Static Checks / Review]
  H --> I[Validation<br/>Tests / Replay / User Need]
  I --> J{Valid?}

  J -- No --> K[Fix Logic / Assumptions]
  K --> G

  J -- Yes --> L[Deployment]
  L --> M[Monitoring / Feedback]
  M --> N{Issue or Change?}

  N -- Yes --> O[Refinement / Update]
  O --> G

  N -- No --> P[Operate / Maintain]
```

## Conclusion

Part of the current enthusiasm around AI development is driven by novelty. It is still remarkable to see systems generate code, workflows, and architectures that previously required much more manual effort. But software engineering has never been judged by whether something can be produced once.

The real question is whether the result can be trusted over time.

- Can the system be maintained?
- Can it be secured?
- Can it be understood by the teams responsible for operating it?
- Can its quality be measured in a credible way?

Those questions matter more than the novelty of generation. AI will almost certainly become part of everyday engineering practice. What does not change is the underlying reality: the risks are still there, and if the risks remain, the controls must remain as well.
