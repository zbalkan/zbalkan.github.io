## Security vs. Compliance: A Humble Critique of Phil Venables’ Vision for Harmonization

Phil Venables, recently shared [his perspective](https://www.philvenables.com/post/regulatory-harmonization-let-s-get-real) on harmonizing compliance and cybersecurity frameworks. His article highlights inefficiencies in regulatory processes and argues for alignment to streamline operations and enhance risk management. While his vision is compelling and valuable, I believe it’s crucial to explore a limitation that stems from the very nature of compliance and cybersecurity: they address fundamentally different risks, owned by distinct entities with divergent objectives.

My critique is not of Venables’ call to action —it is sound and necessary— but rather a complementary addition to the discussion. By recognizing the inherent restrictions to harmonization, in my perspective, we can set realistic expectations and actionable goals for achieving alignment where it truly matters.

Before I begin, I would like to point out that I work in payments sector, therefore my approach to risk has flavors from both cyber risk and financial risk taxonomy.

### Different Risk Owners, Different Objectives

At the heart of compliance and cybersecurity is the principle of **risk management**, but they approach it from different vantage points.

#### Compliance: Managing Systemic Risks

Compliance frameworks are designed to mitigate **systemic risks**—those that threaten the stability of entire systems, sectors, or regions[^1]. These risks are **owned by regulators**, who define objectives that serve the broader ecosystem.

- **Example**: PCI DSS aims to ensure the stability of payment systems by enforcing a baseline of security controls across participating entities.
- **Focus**: Regulators are concerned with preventing cascading failures, not individual company outcomes. For instance, EMV Co focuses on systemic payment system integrity, not whether a company survives a ransomware attack.[^2]

#### Cybersecurity: Managing Organizational Risks

Cybersecurity, in contrast, focuses on **organizational risks**—unique threats to a company’s assets, operations, and reputation. These risks are **owned by the organization** and require tailored, dynamic responses. Continuing the theme of financial jargon, we can call the [idiosyncratic risks](https://corporatefinanceinstitute.com/resources/career-map/sell-side/risk-management/idiosyncratic-risk/) as well.[^3]

- **Example**: A company may deploy advanced endpoint detection systems to prevent ransomware attacks, even if such measures are not required by compliance frameworks.
- **Focus**: Security efforts prioritize the entity’s resilience and continuity, addressing risks that compliance does not cover.

**The Divergence**: Regulators own systemic risks and set compliance objectives for collective stability, while organizations own cybersecurity risks and adapt to their unique, evolving threats. This fundamental separation creates limits to the convergence of compliance and cybersecurity.

### The Ratio Legis of Compliance

To understand the limits of harmonization, we must revisit the **ratio legis** —the reason behind the law— for compliance frameworks. Compliance exists to protect systemic stability, not individual entities. Its purpose is to create a baseline that ensures no single participant undermines the integrity of the entire system.

This explains why compliance frameworks:

1. Focus on minimum standards that apply universally, not advanced protections tailored to specific entities.
2. Care about cascading risks that could destabilize the ecosystem, rather than the individual survival of participants.

**Why This Matters**: Expecting compliance to align fully with cybersecurity ignores this foundational principle. Compliance frameworks are inherently scoped to systemic risks, while cybersecurity strategies must address risks beyond these baselines.

### Venables’ Vision: A Complementary Perspective

Venables’ article calls for harmonization to reduce inefficiencies in compliance, such as duplicative reporting and conflicting standards. I agree wholeheartedly with this goal. Streamlining compliance processes allows organizations to focus resources on meaningful security measures. However, the article’s vision could benefit from acknowledging the structural constraints to harmonization.

#### What We Agree On

- **Streamlining Is Essential**: Reducing redundancies in compliance reporting and certification is critical for efficiency.
- **Compliance Can Foster Security**: By enforcing baselines, compliance frameworks contribute to improved security postures across ecosystems.

Compliance often serves as a critical driver of security budgets, especially when there’s a disconnect between the mental models of executives and security teams. In such cases, compliance becomes the ally that security teams rely on to justify necessary investments.

#### What Needs Clarification

The alignment of compliance and cybersecurity has natural limits due to their differing objectives and ownership structures:

1. **Ownership Divide**: Regulators own systemic risks; organizations own their cybersecurity risks. This difference defines the scope and priorities of each.
2. **Static vs. Dynamic Needs**: Compliance frameworks evolve slowly to maintain stability, whereas cybersecurity must adapt rapidly to new threats. This temporal disconnect restricts alignment.

**Setting Realistic Targets**: Rather than seeking full alignment, we should aim for practical harmonization—simplifying processes, enhancing mutual understanding, and addressing overlapping areas.

### A Pragmatic Path Forward

To complement Venables’ vision, here are practical ways to approach the alignment of compliance and cybersecurity while respecting their inherent differences:

1. **Use Compliance as a Baseline**:
   - Treat compliance frameworks as a starting point, not a ceiling. Extend beyond them with security measures tailored to the organization’s risks.

2. **Bridge Gaps Strategically**:
   - Harmonize reporting and certification processes where possible to reduce operational burdens without expecting complete convergence.

3. **Educate Stakeholders**:
   - Help regulators and businesses understand the structural limits of alignment, focusing efforts on areas of mutual benefit.

4. **Focus on Shared Objectives**:
   - Identify areas where compliance and cybersecurity naturally overlap, such as incident response coordination, and prioritize harmonization there.

### Conclusion: Respecting the Limits of Alignment

Phil Venables’ call for harmonization is an important and valuable contribution to the ongoing dialogue about compliance and cybersecurity. However, I believe it’s equally important to recognize the limits of alignment. Compliance and cybersecurity address different risks, owned by different stakeholders, with fundamentally different objectives.

Acknowledging these structural constraints allows us to set realistic goals for harmonization. Instead of striving for perfect alignment, we should focus on managing the interplay between compliance and security intelligently, leveraging their strengths to build resilient organizations and stable ecosystems. By doing so, we can contribute meaningfully to the shared goal of effective risk management.

This criticism is provided in an effort to foster discussion. I hope my observations deepen the discussion and promote a fair harmonisation strategy.

---

[^1]: In this article, I use the term **systemic risk** in a broader way than its [primary meaning used in finance](https://en.m.wikipedia.org/wiki/Systemic_risk), which focuses on the collapse of financial systems or markets due to cascading failures. Here, **systemic risk** refers to threats to the stability of any large-scale, interconnected system, like payment networks, energy grids, or even global financial systems. This broader view highlights common traits of systemic risks: they’re interconnected, they can have far-reaching impacts, and managing them requires collaboration between regulators, supervisors, and organizations. By looking at systemic risk this way, we can better understand how compliance frameworks work to keep entire systems stable, whether we’re talking about critical infrastructure or global networks.

[^2]:  I would like to note that due to the interdependent nature of the real world, the network of entities has some nodes that are more significant than others in the scale of the cascading failure probability. Of course, the statement that "EMV Co focuses on systemic payment system integrity, not whether a company survives a ransomware attack" does not apply to those critical nodes of the interdependency network.

[^3]: For a better understanding of systemic risk and idiosyncratic risks, I suggest [the short reading from Systemic Risk Centre](https://www.systemicrisk.ac.uk/systemic-risk).
