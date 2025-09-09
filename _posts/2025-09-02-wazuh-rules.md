---
title: "Understanding the Wazuh rules"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Detection Engineering
  - Testing
  - Detection-as-Code
galleryRules:
  - url: /assets/rulevis-graph-wazuh-rules.png
    image_path: /assets/rulevis-graph-wazuh-rules.png
galleryTheory:
  - url: /assets/rulevis-graph-theory.png
    image_path: /assets/rulevis-graph-theory.png
galleryAnimations:
  - url: /assets/rulevis-general-view.gif
    image_path: /assets/rulevis-general-view.gif
  - url: /assets/rulevis-stats-panel.gif
    image_path: /assets/rulevis-stats-panel.gif
  - url: /assets/rulevis-heatmap-view.gif
    image_path: /assets/rulevis-heatmap-view.gif
---

Detection logic can be expressed in many ways, from portable detection languages such as Sigma or YARA to embedded queries in SPL or KQL. Some formats behave like translators across platforms, others like frameworks for complex event sequences, and still others are query languages tied directly to a backend. Each balances portability, expressiveness, and testability differently. In this article, the focus is on the Wazuh rule language, a pseudo-XML syntax. Unlike query-driven systems, Wazuh rules are chained hierarchically, with relationships defined explicitly by the user.

Wazuh rules are often mistaken for isolated conditions, but in reality they form connected chains of logic that determine how detections are escalated. Grasping this structure is essential for detection engineers, because poor models lead to redundant rules, silent misses, or floods of noisy alerts. The official documentation explains syntax, yet it does not show the relationships in a way that makes them easy to reason about. In my experience, building a mental model with diagrams and structured reviews saves significant time when troubleshooting or scaling deployments.

Unlike Sigma or other detection languages/formats where rules are written independently, Wazuh requires a hierarchical approach. In essence, Wazuh is a [complex event processing (CEP)](https://en.wikipedia.org/wiki/Complex_event_processing) engine for near real-time procesing. It fits in the category of [stream processing](https://en.wikipedia.org/wiki/Stream_processing) as well. However, other engines, such as those implementing the RETE algorithm, automatically build a rule network to optimize matching between rules and facts. Some of the other engines using Sigma, YARA or YARA-L build an [Aho-Corasick](https://en.wikipedia.org/wiki/Aho%E2%80%93Corasick_algorithm) automaton out of the string matching patterns. Wazuh, on the other hand, leaves this decision to the user, making inter-rule relationships an integral part of writing rules rather than an optional enhancement.

## Analysis of rule syntax

### Syntax and correlation

[Wazuh documentation](https://documentation.wazuh.com/current/user-manual/ruleset/ruleset-xml-syntax/rules.html) defines rule syntax clearly. In Wazuh, a `rule` is the fundamental unit of detection. Each rule carries an identifier and a level, and may include temporal attributes such as frequency and timeframe that control how alerts are generated. Rules can be assigned to `group`s, which act as labels for correlation and filtering, and their dependencies are defined with conditional directives. `if_sid` links a rule to one or more parents by ID, while `if_group` attaches it to all rules within a labeled group. These create context, allowing a rule to refine or escalate earlier matches. `if_matched_sid` and `if_matched_group` extend this further by requiring repeated matches within a timeframe, enabling the detection of brute-force attempts, repeated failures, or widespread activity. Without temporal attributes rules remain atomic, firing on single events; with them, they become stateful, tracking patterns over time. Additional directives exist, such as `if_level`, which ties a rule to the severity of a prior match, and `if_fts`, which triggers on novelty. These are less central to parent–child correlation and are rarely emphasized in practice. Alongside this logic, the `description` element provides context rather than conditions. It is metadata attached to a rule, intended to make alerts understandable and actionable. The field accepts any string, and since version 3.3 it may include dynamic values with the $(field_name) syntax, such as embedding the source IP in an SSH login attempt. If multiple descriptions are declared they are concatenated into a single message. While `description` does not influence correlation, it is essential for interpretation, because it explains the event in plain terms and allows operators to respond without parsing the raw fields.

For conditions, you can use `match`, `regex`, `field`, and static fields like `user`, `hostname`, `location`, `srcip` and `dstip`. These are used for atomic detections. In layman terms, these are what the engine looks for in each log record. Since I am going to focus on the correlations between the rules, these conditions will be omitted from now on.

At the core of the engine are two data structures: `RuleNode` and `RuleInfo`. `RuleNode` maintains the links, connecting rules horizontally to siblings and vertically to children, while `RuleInfo` stores the logic and metadata. Rules are chained explicitly with directives such as `if_sid`, `if_group`, `if_matched_group`, or `if_matched_sid`. This structure is designed with a (singly) [linked list](https://en.wikipedia.org/wiki/Linked_list) in mind with some extras.

```c
typedef struct _RuleNode {
    struct _RuleNode *sibling;
    struct _RuleNode *child;
    RuleInfo *info;
} RuleNode;

typedef struct _RuleInfo {
    int id;
    char *group;
    char *description;
    // ... other fields ...
} RuleInfo;
```

A sample linked list for reference:

```c
typedef struct Node {
    struct Node *next;
    int data;
} Node;
```

So, there are two relationships a rule can have: sibling and child. Sibling rules points to the rules have same parent -including *no parent* condition. Therefore, it is the `next` pointer in a linked list. The child relationship is more obvious: if the rule engine matches a rule, it will check the child rules afterwards. As you might notice, this is a [Breadth-first search (BFS)](https://en.wikipedia.org/wiki/Breadth-first_search>) algorithm example for the traversal.

To place Wazuh's approach in context, it helps to compare rule structures more broadly. A tree enforces a single parent per node and forbids cycles, which limits flexibility. A directed acyclic graph (DAG) allows multiple parents but still prevents loops. Wazuh's rule structure, however, is more general. It supports multiple parents and allows cycles if the rules are not carefully designed. For instance, a loop referring to itself can cause **out-of-memory** [issues](https://github.com/wazuh/wazuh/issues/10730).

{% include gallery id="galleryTheory" caption="Comparison of a generic directed graph, a DAG, and a tree. Wazuh's rule structure most closely resembles the first, because multiple parents and cycles are possible." %}

### Understanding rules

Let's analyze a set of rules by means of correlation.

```xml
<!-- Rule conditions are omitted for brevity -->

<group name="example_rules,">

  <rule id="200000" level="3">
    <description>Base event</description>
  </rule>

  <rule id="200100" level="4">
    <description>Next sibling</description>
  </rule>

  <rule id="200110" level="6">
    <if_sid>200100</if_sid>
    <description>Child of 200100</description>
  </rule>

  <rule id="200200" level="5">
    <description>Another sibling rule</description>
  </rule>

  <rule id="200201" level="5">
    <description>Yet another sibling node</description>
  </rule>

  <rule id="200210" level="7">
    <if_sid>200200,200201</if_sid>
    <description>Child of both 200200 and 200201</description>
  </rule>

  <rule id="200300" level="6">
    <description>Another sibling rule with group</description>
    <group>sample_group_1,</group>
  </rule>

  <rule id="200310" level="8">
    <if_group>sample_group_1</if_group>
    <description>Child rule linked to group</description>
  </rule>

  <rule id="200400" level="7">
    <description>Another sibling</description>
  </rule>

  <rule id="200410" level="9" frequency="10" timeframe="60">
    <if_matched_sid>200400</if_matched_sid>
    <description>Threshold child of 200400</description>
  </rule>

  <rule id="200500" level="8">
    <description>Complex branch root, another sibling</description>
    <group>sample_group_2,</group>
  </rule>

  <rule id="200510" level="9">
    <if_sid>200500</if_sid>
    <description>Child of 200500</description>
    <group>sample_group_3,</group>
  </rule>

  <rule id="200511" level="10">
    <if_sid>200510</if_sid>
    <description>Child of 200510</description>
    <group>sample_group_5,</group>
  </rule>

  <rule id="200512" level="10">
    <if_group>sample_group_3</if_group>
    <description>Child linked by group</description>
    <group>sample_group_5,</group>
  </rule>

  <rule id="200520" level="9">
    <if_group>sample_group_2</if_group>
    <description>Another child of 200500</description>
  </rule>

  <rule id="200521" level="10">
    <if_sid>200520</if_sid>
    <description>Child of 200520</description>
  </rule>

  <rule id="200600" level="8">
    <description>Separate rule, another sibling</description>
    <group>sample_group_4,</group>
  </rule>

  <rule id="200610" level="9">
    <if_sid>200600</if_sid>
    <description>Child of 200600</description>
  </rule>

  <rule id="200611" level="10">
    <if_sid>200610</if_sid>
    <description>Child of 200610</description>
    <group>sample_group_5,</group>
  </rule>

  <rule id="200620" level="9">
    <if_group>sample_group_4</if_group>
    <description>Group-based child</description>
  </rule>

  <rule id="200621" level="10" frequency="5" timeframe="30">
    <if_matched_sid>200620</if_matched_sid>
    <description>Threshold child of 200620</description>
  </rule>

  <rule id="200612" level="11">
    <if_group>sample_group_5</if_group>
    <description>Escalation from multiple parents</description>
  </rule>

,</group>
```

In this example, rules like **200100**, **200200**, and **200201** act as sibling bases, each with children (`if_sid`). Some rules escalate via `if_group` (200300, 200310, 200620), while others apply thresholds with `if_matched_sid` (200410, 200621). Rule **200510** demonstrates multiple relationships (`if_sid` + `if_group`), and rule **200612** shows convergence, receiving inputs from several different parents. These relationships illustrate how Wazuh builds both horizontal sibling chains and vertical parent–child connections. I suggest having a look at the graph and the rules above together.

{% include gallery id="galleryRules" caption="Visualization of the sample rules above. Dashed arrows indicate siblings, while solid arrows show parent–child or escalation links." %}

### Visualization and RuleVis

Thinking in correct data structures rather than isolated rules changes how detection engineers approach their work. The flexibility enables powerful detection logic, but it also carries risks. Loops, redundant escalations, and missed links are easier to identify with visualization and documentation. Three practices consistently reduce complexity: document parent–child relationships, visualize the structure at regular intervals, and review it with fresh eyes before promoting changes. Even a simple diagram exported before and after a quarterly review provides tangible proof that the rules evolve deliberately.

However there is no native tool providing this feature. I built a script to use personally some time ago. Recently, I decided to release publicly. It was a single page solution with D3.js involved. But due to the high memory use, I rewrote in Python and plain JS that uses D3.js. It runs a local flask app that parses rules in a folder, builds the graph structure, aggregates and calculates statistics, and finally visualize them in a proper manner. The tool is named [RuleVis](https://github.com/zbalkan/rulevis) -*not so creative*.

RuleVis addresses this gap by rendering the ruleset as an interactive force-directed view, where rules appear as nodes and their dependencies as directed edges. The structure can be explored by expanding nodes on demand or by searching for a specific identifier, and each node reveals its metadata, including descriptions and group assignments, so that the XML becomes a navigable structure rather than an opaque text file. The tool also produces statistics that emphasize foundational rules with large numbers of children, rules with the broadest influence across the set, and cases where cycles or isolated nodes exist. A complementary heatmap shows the distribution of rule identifiers, highlighting crowded ranges and revealing those that remain unused and therefore suitable for custom development.

{% include gallery id="galleryAnimations" caption="Rulevis provides a graph structure, heatmap and stats for further analysis." %}

By combining visualization with statistical analysis, RuleVis makes the internal structure of Wazuh rules visible and interpretable. It supports both the debugging of existing dependencies and the deliberate design of new ones, turning what was previously an abstract XML ruleset into a tool for planning and maintenance. Further information, including installation and usage details, is available in the [GitHub repository](https://github.com/zbalkan/rulevis).

While you can run this on Wazuh server or a test machine as well, I suggest using this locally with both built-in and custom rules downloaded. You can use a development environment following the article [I wrote some time ago](https://zaferbalkan.com/wazuh-devenv/), which would be the best in general. Be aware that the more custom rules you have, the more analysis step takes time.

## Conclusion

Wazuh's rule engine is best understood as a flexible system of relationships. Once this model is internalized, rules become easier to reason about, maintain, and scale. The complexity does not disappear, but when understood and maintained properly, it becomes a source of flexibility and precision instead of confusion. The engine traverses a graph structure per log, and if the graph is properly designed, the [time complexity](https://en.wikipedia.org/wiki/Time_complexity) gets closer to *O(log N)*, where *N* is the number of rules. If it was a regular list and rules were evalueared in a loop, the complexity would be *O(N)*, which means the worst case scenario is looping till the last rule in the list. So, the performance of Wazuh relies on properly built hierarchy of rules.

Start with a catch-all rule and get more specific one by one. Wazuh rules are building blocks. That's why you cannot convert from Sigma rules directly. You need to know existing rules in your ruleset to build new rules on top.

Now that you have a more accurate mental model of the Wazuh rules, review your custom rules to see waht you can find and fine-tune. And please, do not copy-paste rules you find on various resources.
