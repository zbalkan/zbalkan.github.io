---
title: "Understanding the Wazuh Rule Graph Structure"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Detection Engineering
  - Testing
  - Detection-as-Code
galleryRules:
  - url: /assets/graph-wazuh-rules.png
    image_path: /assets/graph-wazuh-rules.png
galleryTheory:
  - url: /assets/graph-.png
    image_path: /assets/graph-theory.png
---

A graph is one of the most fundamental data structures in computer science and discrete mathematics. Formally, a graph consists of a set of objects called **vertices** (or **nodes**) and a set of **edges** connecting pairs of these vertices. The edges may be bidirectional or unidirectional, and may or may not have weights assigned to them. Graphs are used to model pairwise relationships between entities and are ubiquitous in areas such as network analysis, social networks, and computational biology. The generality of graphs allows for the presence of cycles, meaning it is possible to follow a sequence of edges from a node and eventually return to the same node.

To facilitate direct comparison, Image 2 arranges the three principal graph structures—Directed Graph, Directed Acyclic Graph (DAG), and Tree—side by side, from left to right. This horizontal layout allows readers to visually scan and contrast the essential characteristics of each structure at a glance. The first diagram illustrates a general **directed graph**, where edges have direction and cycles are allowed. The second diagram demonstrates a **DAG**, where edges have direction but cycles are forbidden, supporting multiple parents for some nodes (as shown by converging edges). The third diagram presents a **tree**, a special case of a DAG, which always has a unique root and each node (except the root) has exactly one parent, enforcing a strict hierarchy.

When every edge in the graph is assigned a direction, the structure is referred to as a **directed graph**, or **digraph**. In a directed graph, each edge goes from one vertex, designated as the source, to another vertex, designated as the target, and this directionality is crucial in modeling many real-world phenomena such as web page links, citation networks, and process flows. Directed graphs may also contain cycles, in which a path following the direction of the edges leads back to the originating node. The presence of cycles can complicate certain algorithms, such as those for dependency resolution or topological sorting.

A more specific form of a directed graph is the **directed acyclic graph** (DAG). As the name suggests, a DAG is a directed graph that contains no cycles. That is, it is impossible to start at any vertex and follow a sequence of directed edges that eventually loops back to the original vertex. DAGs are particularly important in computer science because they naturally model systems where dependencies must be resolved in order, such as in task scheduling, compiler optimization, and version control systems like Git. The absence of cycles in DAGs makes it possible to perform a topological sort, which produces a linear ordering of vertices that respects the directionality of the edges.

The **tree** is a special case of a DAG that is characterized by a hierarchical structure. In a tree, there is a unique root node and every other node has exactly one parent. This constraint ensures that there are no cycles and no node has multiple parents, resulting in a clear and unambiguous hierarchy. Trees are fundamental in organizing data (such as in file systems and databases) and in algorithms (such as search and sort operations).

When analyzing the structure underpinning Wazuh rules, it becomes clear that it shares similarities with each of these concepts but does not fit perfectly into the more restrictive categories of trees or DAGs. In Wazuh, each rule may have horizontal links to sibling rules (indicating sequence or grouping) and vertical links to child rules, often established through mechanisms such as `if_sid` or `if_group`. Importantly, a given rule may be referenced as a child by multiple parent rules, which immediately disqualifies the structure from being a tree. Furthermore, it is possible—unless the engine enforces strict constraints—for cycles to arise, such as when a chain of parent-child relationships loops back to an ancestor. In the presence of such cycles, the structure ceases to be a DAG.

Therefore, the Wazuh rule structure is best described as a **general directed graph**. It comprises nodes (the rules) and directed edges (the parent-child and sibling relationships). The possibility of multiple parents and cycles means that it cannot be classified as a tree or a DAG. This directed graph framework allows for rich and flexible rule relationships, but also necessitates careful handling in algorithms that traverse or analyze the rule set, especially with respect to cycle detection and prevention of infinite loops.

{% include gallery id="galleryTheory" caption="Image 2" %}

The accompanying graph (Image 1) provides a visual representation of the Wazuh rules structure as discussed previously. In this diagram, each node corresponds to a distinct rule, and the edges illustrate the relationships between these rules. The horizontal, dashed arrows labeled "sibling" connect rules that reside on the same conceptual level, reflecting the linked list traversal often used to group or sequence rules within Wazuh. Vertical arrows, on the other hand, indicate parent-child relationships formed through mechanisms such as `if_sid`, `if_group`, or `if_matched_sid`, and are annotated to clarify the nature of each connection. For instance, the rule labeled 200200 points downward to 200210 via an "if_sid" edge, while 200400 links to 200410 with an "if_matched_sid" edge that includes frequency and threshold parameters.

{% include gallery id="galleryRules" caption="Image 1" %}

The lower portion of the graph demonstrates the capacity for rules to have multiple children and, notably, for a child rule to have multiple parents, as seen with node 200612, which receives edges from several different parent nodes. This branching and merging behavior exemplifies why the Wazuh rule structure is best described as a general directed graph: nodes can participate in complex dependency relationships, and the overall structure does not enforce strict hierarchy or acyclicity. The image thus serves as a concrete illustration of how both sibling and parent-child relationships coexist within Wazuh rules, resulting in a rich and flexible rule topology that supports advanced logic and interdependencies.

In summary, while trees and DAGs provide elegant and restrictive models for hierarchical and dependency-based data, the Wazuh rule structure exemplifies the more general and complex nature of directed graphs, with the attendant challenges and expressive power that such a structure entails. The provided images offer a clear visual context for these relationships, highlighting first the theoretical distinctions between graph structures (in Image 2), and then the flexibility and complexity inherent in the Wazuh rule graph (in Image 1).
