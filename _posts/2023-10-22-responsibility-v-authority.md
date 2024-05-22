# Responsibility v. Authority: the Good, the Bad and the Ugly

- [The Good](#the-good)
  - [GDPR Article 38(2): Start with what a DPO needs](#gdpr-article-382-start-with-what-a-dpo-needs)
  - [The rulings of DPAs](#the-rulings-of-dpas)
  - [*Sensum, non verba spectamus*](#sensum-non-verba-spectamus)
- [The Bad](#the-bad)
  - [The guidance of the Council](#the-guidance-of-the-council)
  - [What about the conflict of interest?](#what-about-the-conflict-of-interest)

- [The Ugly](#the-ugly)

It is a well-known phenomenon that authority without responsibility -and vice versa- is a recipe for disaster. Yet, that is commonly seen in many organizations. These two words are used interchangeably and incorrectly on due diligence practices and business services. On one hand, it is easy to prove the responsibility: have a RACI chart on a policy, a well-written business contract, or a written executive order. On the other hand, how do you prove the authority? What might consist of evidence of authority of someone in an organization?

I believe it is better to discuss examples of this problem for a better understanding. A good example is on the Data Protection Officer (henceforth DPO) role and the requirements defined by GDPR. The bad example chosen is The Payment Card Industry Data Security Standard (herein after PCI DSS) version 4.0 and the requirements of the information security manager. Both define the requirements of a role being held responsible for significant factors of a company, one focuses on privacy, and the other addresses security. In this article, I will be analyzing the requirements to appoint rather than the details of responsibility. So, the question is not "What does a `<role>` do?", but "Who can be appointed as `<role>` -according to `<regulation>`?".

## The Good

GDPR is a body of regulations on privacy by the EU, which applies to anywhere around the world as long as the collected data belongs to EU citizens. In this context, a DPO is a high-level officer who is responsible for the data privacy of the organization. You can search for the other details out of scope. There are two great resources on the assignment, roles, and responsibilities of a DPO: GDPR articles as a baseline (Articles 37, 38, and 39) and case laws ruled by Data Protection Authorities (herein after DPA) incrementally built on lessons learned.

### GDPR Article 38(2): Start with what a DPO needs

GDPR [Article 38(2)](https://gdprhub.eu/Article_38_GDPR) requires that all necessary resources be provided to fulfill the DPO tasks to be able to appoint a DPO, which can be considered a significant requirement to prevent GDPR from being a tick-the-box practice. So, what are these resources in general?

- Senior management must support the DPO and provide sufficient time for them to fulfill their responsibilities.
- The support provided to the DPO should encompass adequate financial, technical, and personnel resources.
- It is ... essential to communicate the existence and contact details of the DPO to all staff members of the controller or processor to ensure accessibility.
- DPO has to have the authority to access personal data and processing operations within the organization.
  - *For example, the DPO must be allowed to enter all premises where personal data is or may be processed, including on the premises of data processors.*
- DPO must have continuous training opportunities to maintain expert knowledge.
  - *The "expert knowledge" is also a requirement to assign in the first place*
- "The DPO must be put in the condition to autonomously catch up with the relevant updates, being the workload no justification to postpone or ignore such an obligation".
  - *A highly specific requirement, isn't it?*


To quote the conclusion:
> In general, the allocation of resources for the DPO should be directly proportional to the type, complexity, and risks associated with data processing activities.

The high-level -yet sufficiently specific- requirements allow flexibility for the organizations to structure their environment along with modifying their processes. But they also cause ambiguity. That is where case laws shine.

### The rulings of DPAs

In 2020, APD/GBA (Belgium), [the Belgian DPA imposed a **50,000 EUR** fine](https://gdprhub.eu/index.php?title=APD/GBA_-_18/2020) on a company for failing to assign the correct person as DPO. The firm designated its Chief of Compliance, Risk Management, and Audit as the DPO. However, the Belgian DPA (DPA) identified that this role allocation created a conflict of interest.

The Guidelines specify that the roles and responsibilities of a DPO should not create a conflict of interest. This means that the DPO should not have a role in the organization that allows them to set the objectives and methods for handling personal data. [Positions that are incompatible with the DPO role](https://www.dentons.com/en/insights/articles/2021/may/13/the-dpo-and-conflicts-of-interest-what-functions-are-compatible-with-the-dpo) may include:

- **Formal Approach:** High-level managerial roles like CEO, COO, CFO, Chief Medical Officer, Head of Marketing, Head of HR, or Head of IT;
- **Functional Approach:** Lower-level positions in the organizational hierarchy that still have the authority to define the objectives and methods of data processing.

Furthermore, the DPA notes that a conflict of interest could also occur if an external DPO is tasked with representing the data controller or processor in legal matters related to data protection.

The DPA concluded that merging the roles of the DPO and the director in charge of audit, risk, and compliance within the organization inherently leads to a situation where the individual sets the goals and methods for data processing. This makes independent oversight unfeasible, thereby constituting a clear conflict of interest based on the formal approach.

In sum, the DPO should not be tasked with the conflicting responsibilities of both *establishing the organization's data protection policies* and simultaneously *assessing whether these policies comply* with legal regulations.

Later, a pragmatic approach was ruled in 2021. A [Chief Information Security Officer (henceforth CISO) was appointed as DPO](https://gdprhub.eu/index.php?title=APD/GBA_(Belgium)_-_56/2021)! However, unlike many other C-level/executive positions, the boundaries of the CISO role are still ambiguous and there may be different embodiments of the role in different contexts. Therefore, the court made a decision that eventually became the answer to the question "When can a CISO be appointed as a DPO":

- If the CISO performs risk analyses and presents suggested mitigation measures to the management;
- Management decides whether or not to adopt the suggested measures;
- Security measures are not within the scope of the function of the CISO.

The problem, in the real world, is what is the ratio of "advisory-only" CISOs? As one can understand, the responsibility and the authority to manage security, risk, and compliance are on the management, not on the CISO. It is not feasible unless the CISO is [a consultant or a vCISO](https://ventureinsecurity.net/p/the-great-ciso-resignation-isnt-what).

In September 2022, [BlnBDI imposed a fine of **525,000 EUR** to a Berlin-based e-commerce company](https://gdprhub.eu/index.php?title=BlnBDI_(Berlin)_-_Berlin_DPO_Conflict_of_Interest). In this case, the DPO for the e-commerce firm wore two hats: they were not only the DPO but also the managing director for two service companies that handled personal data for the e-commerce group. As a result, the Berlin DPA concluded that the DPO was overseeing data processing activities that they had a hand in shaping, due to their role as the managing director of two companies within the same corporate group. No room for a conflict of interest!

### *Sensum, non verba spectamus*

Let's look at the meaning behind the letters: the regulators try to align responsibility with the authority. Hence they provide means to provide and ensure authority (autonomy and absence of conflict of interest) to keep the appointed DPO accountable. Therefore, a letter of appointment or a business contract is not enough to hold someone responsible.

## The Bad

The bad example I chose for a role, its responsibilities, and its requirements is from the PCI DSS. It is an information security standard used to handle credit cards from major card brands, administered by the [Payment Card Industry Security Standards Council (PCI SSC)](https://www.pcisecuritystandards.org/), henceforth the Council. The mandate comes from the card brands.

As a step in the right direction, PCI DSS 4.0, released in 2022 to replace 3.2.1, added a new requirement to strengthen the posture of financial organizations: an executive manager responsible for information security. For the sake of simplicity, I will call this role CISO within the article, but the actual title can differ.

The said requirement in PCI DSS 4.0 is the requirement 12.1.4:
> Responsibility for information security is formally assigned to a Chief Information Security Officer or other information security knowledgeable member of executive management.

Let's have a look at the letters, and then the meaning:

- A CISO or equal executive manager must be formally assigned
- This person must be knowledgeable in information security
- This person is responsible for security

The requirement itself is sadly not as detailed as GDPR's DPO role requirements. Let's check the "Guidance" section for more:

> **Purpose**
>
> To ensure someone with sufficient authority and responsibility is actively managing and championing the organization’s information security program, accountability and responsibility for information security needs to be assigned at the executive level within an organization.
>
> Common executive management titles for this role include Chief Information Security Officer (CISO) and Chief Security Officer (CSO – to meet this requirement, the CSO role must be responsible for information security). These positions are often at the most senior level of management and are part of the chief executive level or C-level, typically reporting to the Chief Executive Officer or the Board of Directors.
>
> **Good Practice**
>
> Entities should also consider transition and/or succession plans for these key personnel to avoid potential gaps in critical security activities.

Great! We have two out of three keywords: `responsibility` and `accountability`. However, the Council does not look for evidence of `authority` or absence of conflict of interest.

### The guidance of the Council

As a result, I had to ask the Council for guidance on the said requirement based on hypothetical scenarios. I am skipping the question for the brevity. Here is the response:

> Per Requirement 12.1.4, responsibility for information security is assigned to a member of executive management with a CISO title, or if they do not have a CISO title, then that person has information security knowledge similar to what someone with a CISO title has. As the guidance column for this requirement states, "Accountability and responsibility for information security needs to be assigned at the executive level within an organization. Common executive management titles for this role include Chief Information Security Officer." If the CISO in an organization is not responsible or accountable for the information security program, then there is flexibility in this requirement to allow it to be met by another executive-level role within an organization that does have that responsibility.

In this context, woefully, there is not a deeper meaning beyond the letters. However, we can safely assume that the "member of executive management" means reporting to the highest level of management like a CEO. In conclusion, assign someone with an information security background as an executive manager, give the security responsibility formally, and present it to the QSA during the audit.

### What about the conflict of interest?

For PCI DSS requirements, the conflict of interest is not mentioned as a specific requirement. One would expect the requirements to mention, *at least*, as a risk to be assessed and accepted under specific conditions. Unfortunately, PCI DSS 4.0 lacks this discussion.

However, I would like to mention a term PCI DSS requirements use very often: Organizational Independence. It is a term close to the conflict of interest:

> An organizational structure that ensures there is no conflict of interest between the person or department performing the activity and the person or department assessing the activity.

According to PCI DSS 4.0, Organizational Independence is required for vulnerability scanners and penetration testers. So, no, it does not cover the executive manager's role who is responsible for security.

Another term the PCI DSS requirements use is "segregation/separation of duties". This is also limited to access controls:
> Requirement 6.4.5: Roles and functions are separated between production and pre-production environments to provide accountability such that only reviewed and approved changes are deployed.
>
> Requirement 7.2.1 An access control model is defined and includes granting access as follows:
> • Appropriate access depending on the entity’s business and access needs.
> • Access to system components and data resources that is based on users’ job classification and functions.
> • The least privileges required (for example, user, administrator) to perform a job function.

Therefore, an organization can appoint a CIO/CTO/CSO/CFO/CHRO without considering a conflict of interest as long as the organization can prove that the appointed person has "provable information security knowledge". The knowledge is vague but it is up to the QSA to decide if the proof of knowledge is sufficient.

------
**Trivia time:**

Q1: *If a CTO had participated in CTFs in college, can the organization fulfill requirement 12.1.4?*

A1: *Luckily no. This is just an exaggeration. However, it is important to be able to prove the information security background.*

------

Q2: *If the organization is part of a larger group, how can the organization fulfill requirement 12.1.4?*

A2: *If there is a CISO (or an equivalent member of executive board) in the group level, and the responsibility of security in both group and local level, then it is possible to comply with the requirement. It means that the local security managers become a representative of CISO and does not carry the overall responsibility in their entity. As long as their authority and responsibility are limited by the tasks and projects assigned by group CISO, the requirement can be fulfilled. However, it is advised to consult the QSA first.*

------

## The Ugly

Even though I harshly criticize the decisions, I can understand the Council's rationale: the organizations differ by scale, location, legal boundaries, and financial capabilities. Therefore, enforcing stricter requirements may backfire on many occasions. However, in this case, there is too much room for improvement causing the related parties to question the reliability of the standard.

Unlike the DPO which GDPR well-defined for many years, CISO or the equivalent of PCI DSS does not have to:

- be independent (not possible in general)
- expert knowledge ("information security knowledgeable" does not mean "expert knowledge")
- financial resources (budget?)
- human resources (a team maybe?)
- continuous training (training and conferences = budget)
- authority on business decisions to fulfill the responsibilities, etc.

The ugly truth here is that PCI DSS defines a role with responsibility but leaves authority out of the equation. Isn't it [blurring the line between being held accountable and being a scapegoat?](https://www.linkedin.com/posts/rosshaleliuk_cisos-ciso-cybersecurity-activity-7120786753451397120-r3D0?utm_source=share&utm_medium=member_desktop)

------

**Trivia time:**

Q3: *If a company assigns the CISO as a DPO by properly meeting the GDPR requirements, would the organization be able to comply with PCI DSS?*

A3: **No.** *Because a CISO assigned as a DPO based on the GDPR requirements has no authority, responsibility, and accountability. The CISO's role is advisory, and the security responsibility belongs to the company management. So this situation does not fulfill the requirements of PCI DSS.*

------

Q4: *If a company hires a consultant as vCISO and vDPO by properly meeting the GDPR requirements, then creates a security team under CTI/CIO/COO holding the associated C-level manager responsible for security, would the company be able to comply with PCI DSS?*

A4: **It depends.** *By appointing a vCISO and vDPO to an advisory role, the company solves the question of GDPR. On the other hand, the C-level executive who manages the security team holds the responsibility of security, therefore, the "formal assignment" and "responsibility" conditions are met as well. However, the "information security knowledge" condition needs to be proven. Also, the organization needs to be aware that the "conflict of interest" is obvious while it is not against PCI DSS requirements as is. This may or may not fulfill the requirements of PCI DSS. You need to discuss this with your QSA.*

------

