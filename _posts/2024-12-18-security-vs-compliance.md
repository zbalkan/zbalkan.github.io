## Security vs. Compliance: A Humble Critique of Phil Venables’ Vision for Harmonization

Phil Venables recently shared [his perspective](https://www.philvenables.com/post/regulatory-harmonization-let-s-get-real) on harmonizing compliance and cybersecurity frameworks. His article highlights inefficiencies in regulatory processes and argues for alignment to streamline operations and enhance risk management. While his vision is compelling and valuable, I believe it is crucial to explore a limitation that stems from the very nature of compliance and cybersecurity: they address fundamentally different risks owned by distinct entities with divergent objectives.

My critique is not of Venables’ call to action —it is sound and necessary— but rather a complementary addition to the discussion. By recognizing the inherent restrictions to harmonization, in my perspective, we can set realistic expectations and actionable goals for achieving alignment where it truly matters.

Before I begin, I would like to point out that I work in the payments sector, therefore my approach and taxonomy of risk have flavours from both the cyber risk and financial risk corpus.

### Different Risk Owners, Different Objectives

At the heart of compliance and cybersecurity is the principle of **risk management**, but they approach it from disparate vantage points.

#### Compliance: Managing Systemic Risks

Compliance frameworks are (mostly[^2]) designed to mitigate **systemic risks**—those that threaten the stability of entire systems, sectors, or regions[^1]. These risks are **owned by regulators**, who define objectives that serve the broader ecosystem. Regulators can be political institutions like the EU or national governments, or sectorial institutions like the IMF, World Bank, SEC (U.S. Securities and Exchange Commission), EMV Co, etc. The objectives, in parallel, differ. They may be protecting the health information or privacy of citizens or ensuring financial stability.

In this network of interconnected ecosystems, an organization is generally regulated by more than one entity (GDPR and DORA by the EU, PCI DSS by EMV Co, etc.). There is another player in the game: supervisors. Regulators may have the ability to conduct the supervisory duties by themselves, but it is seen that there are separate supervisory bodies. For instance, "the Bank of England vs. the Financial Conduct Authority", or "EMV Co vs. PCI SSC" are some examples of regulator-supervisor pairs. It is generally not a hierarchical structure but a cooperation initiative. It is possible to have an analogy of governance vs. management layers.

In these kinds of environments, the organizations generally are interfacing with the supervisors, while the risks and objectives belong to the regulators. These supervisory bodies are also part of risk mitigation measures: building enforcement and audit capabilities. It is similar to governments building their law enforcement and legal institutions.

Once we understand the roles in the ecosystem, we can switch back to the risk debate: Regulators are concerned with preventing cascading failures, not individual company outcomes. For instance, EMV Co focuses on systemic payment ecosystem integrity, not on whether a company survives a ransomware attack[^3]. The role of PCI SSC, in this case, is to assess the organizations regularly and investigate after incidents.

#### Cybersecurity: Managing Organizational Risks

Cybersecurity, in contrast, focuses on **organizational risks**—unique threats to a company’s assets, operations, and reputation. These risks are **owned by the organization** and require tailored, dynamic responses. Continuing the theme of financial jargon, we can call the [idiosyncratic risks](https://corporatefinanceinstitute.com/resources/career-map/sell-side/risk-management/idiosyncratic-risk/) as well[^4].

- **Example**: A company may deploy advanced endpoint detection systems to prevent ransomware attacks, even if such measures are not required by compliance frameworks.
- **Focus**: Security efforts prioritize the entity’s resilience and continuity, addressing risks that compliance does not cover.

**The Divergence**: Regulators own systemic risks and set compliance objectives for collective stability, while organizations own cybersecurity risks and adapt to their unique, evolving threats. This fundamental separation creates limits to the convergence of compliance and cybersecurity.

This proposition does not mean systemic risks are too broad to consider cyber risks. On the contrary, cyber risks **are** considered systemic risks, depending on the entity in the ecosystem[^5].

### The Ratio Legis of Compliance

To understand the limits of harmonization, we must revisit the **ratio legis** —the reason behind the law— for compliance frameworks. Compliance, with all regulatory and supervisory bodies, exists to protect the stability of ecosystems, not individual entities. Its purpose is to create a baseline that ensures no single participant undermines the integrity of the entire system.

This explains why compliance frameworks:

1. Focus on minimum standards that apply universally, not advanced protections tailored to specific entities.
2. Care about cascading risks that could destabilize the ecosystem, rather than the individual survival of participants.

**Why This Matters**: Expecting compliance to align fully with cybersecurity ignores this foundational principle. Compliance frameworks are inherently scoped to systemic risks, while cybersecurity strategies must address risks beyond these baselines.

With these fundamental reasons established, let’s examine how these principles play out in real-world scenarios, such as the Equifax breach.

### The effects of the divergence

Let's get the discussion to a real-world scenario. In 2017, one of the widely known breaches occurred: the Equifax breach. Equifax is an American company in the business of consumer credit reporting. Due to the nature of their job, they are not only under the regulation of national standards but also the sectorial ones like PCI DSS (Equifax had ISO/IEC 27001 certification before the breach, but for the sake of the argument, this is out of scope for now).  The breach occurred "in a database that had not been included in the scope of Equifax Inc.’s annual Payment Card Industry Data Security Standard (PCI DSS) certification" \[*sic*] [^6], according to [PIPEDA Findings](https://www.priv.gc.ca/en/opc-actions-and-decisions/investigations/investigations-into-businesses/2019/pipeda-2019-001/). As EMV CO cares about the payment networks, the scope of PCI DSS requirements is limited to:
> * The cardholder data environment (CDE), which is comprised of:
>    - System components, people, and processes that store, process, or transmit cardholder data and/or sensitive authentication data, and,
>    - System components that may not store, process, or transmit CHD/SAD but have unrestricted connectivity to system components that store, process, or transmit CHD/SAD.
> AND
> * System components, people, and processes that could impact the security of cardholder data and/or sensitive authentication data. [^7]

It was the wrongdoing of Equifax to get breached. They had a vulnerability that was compromised. However, they also had deficiencies in their PCI DSS assessment. Because the Qualified Security Assessor ([QSA](https://www.pcisecuritystandards.org/glossary/#glossary-q)) assessed only in-scope assets, the rest were not reviewed, evaluated, or assessed. Yet, there was business-critical data there, which also consisted of account data. Whatever happened out of scope was still the responsibility of Equifax. Because a QSA would not assess, it should not mean it can be neglected. But it happened, and it cost them a lot.

### Venables’ Vision: A Complementary Perspective

Venables’ article calls for harmonization to reduce inefficiencies in compliance, such as duplicative reporting and conflicting standards. I agree wholeheartedly with this goal. Streamlining compliance processes allows organizations to focus resources on meaningful security measures. Nevertheless, the article’s vision could benefit from acknowledging the structural constraints of harmonization.

I'd like to point out where my opinions differ.

> It’s going to be hard to do this if we keep sticking to the still commonly expressed thought that “compliance is not security”. This statement isn’t actually true. Much of what you might consider a compliance approach can actually foster good security - it is just not enough in all cases. In other words, compliance is a necessary but not sufficient condition.

While I agree with the statement "necessary but not sufficient", this perspective puts compliance efforts in a position to improve the organization's posture. Since the objectives are distinct, the risk mitigation controls are distinct as well. Especially, almost all compliance requirements have a scope. And that scope is generally just a subset of the organization's assets.

<img src="/assets/objectives.png" width="600" alt="Objectives, Risks, Controls">

> First, let’s define compliance as some scheme or rule set to assure a system of governance, risk mitigation and controls that you are operating in evidenced conformance to.

In my opinion, compliance and risk reduction are not two partially overlapping topics. Compliance **is** a risk reduction measure.

<img src="/assets/Perspective.png" width="600" alt="Perspectives">

In sum, the alignment of compliance and cybersecurity has natural limits due to their differing objectives and ownership structures:

1. **Ownership Divides Objectives**: Regulators own systemic risks; organizations own their cybersecurity risks. This difference defines the scope and priorities of each.
2. **Limited scope**: The scope of each standard or regulation may differ, and sometimes the scope is opt-in. Therefore, it never shows the full picture. The full picture can be achieved by the security initiatives owned by the organization.

We can minimize the compliance efforts by harmonizing across standards, frameworks and regulations. However, harmonizing security and compliance has natural limits. Rather than seeking full alignment, we should aim for practical harmonization—simplifying processes, enhancing mutual understanding, and addressing overlapping areas.

### Conclusion: Respecting the Limits of Alignment

It is better to get back to the basics. Risk is defined as "the effect of uncertainty on objectives" in ISO 31000:2018 - Risk Management. Because we want to achieve our objectives, we want to manage risks and clarify the ambiguities. Still, organizations have different objectives and, therefore, different registers of risks. The earlier to accept this, the better.

Phil Venables’ call for harmonization is an important and valuable contribution to the ongoing dialogue about compliance and cybersecurity. Still, I believe it’s equally important to recognize the limits of alignment.

Acknowledging these structural constraints allows us to set realistic goals for harmonization. Instead of striving for perfect alignment, we should manage the interplay between compliance and security intelligently, leveraging their strengths to build resilient organizations and stable ecosystems. By doing so, we can contribute meaningfully to the shared goal of effective risk management.

This criticism is provided in an effort to foster discussion. I hope my observations expand the debate and promote a fair harmonisation strategy.

Now, have a look at the diagram below. Depending on the regulation your organization tries to comply with, which position do you believe is closer to your status?

<img src="/assets/Overlap.png" width="600" alt="Overlapping objectives">

---

[^1]: In addition to ecosystem-level risk mitigation, there is another reason for compliance: third-party risk management. I plan to write about this in a separate article to keep this discussion brief.

[^2]: In this article, I use the term **systemic risk** in a broader way than its [primary meaning used in finance](https://en.m.wikipedia.org/wiki/Systemic_risk), which focuses on the collapse of financial systems or markets due to cascading failures. Here, **systemic risk** refers to threats to the stability of any large-scale, interconnected system, like payment networks, energy grids, or even global financial systems. This broader view highlights common traits of systemic risks: they’re interconnected, they can have far-reaching impacts, and managing them requires collaboration between regulators, supervisors, and organizations. By looking at systemic risk this way, we can better understand how compliance frameworks work to keep entire systems stable, whether we’re talking about critical infrastructure or global networks.

[^3]: It is crucial to acknowledge that, given the interdependent nature of the real world, certain nodes within the network of entities are undeniably more significant than others when it comes to the probability of cascading failure. Of course, the statement that "EMV Co focuses on systemic payment system integrity, not whether a company survives a ransomware attack" does not apply to those critical nodes of the interdependency network. For the critical ones, the regulators and supervisors care more, but it does not mean sharing responsibilities; it is the entity that is accountable for the risks.

[^4]: For a better understanding of systemic risk and idiosyncratic risks, I suggest [the short reading from the Systemic Risk Centre](https://www.systemicrisk.ac.uk/systemic-risk).

[^5]: A cyber incident on critical nodes can cascade aggregated failures and fits into the definition of systemic risk. According to a relatively [recent scenario](https://www.lloyds.com/about-lloyds/media-centre/press-releases/lloyds-systemic-risk-scenario-reveals-global-economy-exposed-to-3.5trn-from-major-cyber-attack), the stakes are high. Cyber risks are on the radar of the EU institutions. The regular meetings of the European Systemic Risk Board always have [an honourable mention](https://www.esrb.europa.eu/news/pr/date/2024/html/esrb.pr241205~6f54b13a54.en.html) of systemic cyber risks.

[^6]: PCI DSS is not certification. There is no such thing as PCI certification. It was an unfortunate choice of words by the official entity.

[^7]: Check the [PCI DSS 4.0.1](https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf), [Guidance for PCI DSS Scoping and Segmentation](https://docs-prv.pcisecuritystandards.org/Guidance%20Document/PCI%20DSS%20General/Guidance-PCI-DSS-Scoping-and-Segmentation_v1_1.pdf) and [PCI DSS Scoping and Segmentation Guidance for Modern Network Architectures](https://docs-prv.pcisecuritystandards.org/Guidance%20Document/PCI%20DSS%20General/PCI-DSS-Scoping-and-Segmentation-Guidance-for-Modern-Network-Architectures.pdf) for details.
