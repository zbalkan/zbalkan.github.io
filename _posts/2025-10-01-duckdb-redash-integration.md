---
title: "Connect Redash to DuckDB Databases"
tags:
  - Database
  - Visualization
  - Duckdb
  - Redash
  - Open Source
galleryFeatures:
  - url: /assets/redash-duckdb-connect.png
    image_path: /assets/redash-duckdb-connect.png
  - url: /assets/redash-duckdb-query.png
    image_path: /assets/redash-duckdb-query.png
  - url: /assets/redash-duckdb-struct.png
    image_path: /assets/redash-duckdb-struct.png
  - url: /assets/redash-duckdb-nested-struct.png
    image_path: /assets/redash-duckdb-nested-struct.png
galleryFunctions:
  - url: /assets/redash-duckdb-functions.png
    image_path: /assets/redash-duckdb-functions.png
galleryAnimation:
  - url: /assets/redash-anim.gif
    image_path: /assets/redash-anim.gif
---

Most of what I write is about cybersecurity. My background is in system administration and security engineering, and now I work as a cybersecurity and compliance manager. Over the years I have had to deal with many different systems, each with their own quirks, gaps, and integration challenges. Out of necessity, I often developed small tools and simple solutions to glue those systems together. They were never intended to be large or polished, but rather to bridge one gap and make my daily work a little easier. I see this DuckDB–Redash runner in the same spirit. It is not a product, but a piece of glue that connects two projects I like and use, and I recently contributed it as a pull request to the Redash repository: [PR #7548](https://github.com/getredash/redash/pull/7548).

[DuckDB](https://duckdb.org/) has become a favorite of mine for lightweight analytical workloads because it combines OLAP features with the simplicity of an embedded database. It sits comfortably between the command-line exploration of Parquet files and the scale of full warehouse deployments. Redash, on the other hand, is an open source SQL analytics and dashboarding platform designed around querying and visualizing data with minimal friction. Until now, the two did not intersect. With this integration, which is now merged into the main Redash repository, DuckDB queries can be run directly in Redash, with schema exploration and dashboards layered on top.

<img src="/assets/redash-duckdb-selector.png" width="800" alt="Redash data source selection with DuckDB visible">

[Redash](https://redash.io/) is worth a short introduction for those who have not seen it before. It is not as feature-rich or polished as commercial BI platforms such as Tableau, but it has a certain strength in being open source, SQL-centric, and light to deploy. You point it at a data source, write queries with a browser-based editor, and turn the results into charts or dashboards that can be shared with others. Teams often use it as a common query layer, replacing one-off SQL scripts or notebook queries with something reproducible. For analysts and engineers who prefer direct access through SQL rather than abstracted layers, it strikes a useful balance. It is around 10 years old, and mature enough.

Even though DuckDB can already be used with Apache Superset through its SQLAlchemy dialect, the experience and philosophy are different. Superset is closer in spirit to Tableau, aiming to be a full-featured BI platform with a wide range of visualization and dashboarding options. Redash is lighter, more SQL-centric, and easier to deploy in small environments. For someone who wants to connect a DuckDB database quickly and share a few dashboards without adopting the full complexity of Superset, this integration offers a simpler path. On the other hand, teams looking for advanced visualization features or tighter integration with large data stacks may still prefer Superset. In that sense, Redash and Superset are complementary rather than competing, and both highlight how DuckDB has grown into an engine flexible enough to sit behind very different analytics stacks.

{% include gallery id="galleryAnimation" caption="Redash dashboard features" %}

The runner treats DuckDB as a first-class source inside Redash. You can connect to either an in-memory database or a file-backed one, depending on whether you want something temporary or persistent. Once connected, Redash introspects DuckDB schemas, including nested types such as `STRUCT`, and exposes them for browsing and autocomplete. `STRUCT` fields expand recursively, almost like pseudo-columns, which makes complex JSON-like schemas easier to navigate. In the screenshot below, you can see how nested fields unfold directly in the schema explorer, turning what could be opaque structures into queryable components.

Beyond schema handling, the runner also respects DuckDB’s type system, mapping fields such as `VARCHAR`, `HUGEINT`, `STRUCT`, and JSON into Redash. It supports extension loading as well, with community extensions accessible using the `community.*` prefix. That means you can bring in functions like those from `community.hashfuncs` without extra setup, or install and load your own extensions after connection. This alignment ensures that working inside Redash feels close to working directly with DuckDB, but with the benefit of visualization and dashboards layered on top.

{% include gallery id="galleryFeatures" caption="DuckDB connection configuration in Redash, querying, structs and nested structs" %}

I should admit that writing this integration stretched me beyond my comfort zone. I am not a frontend developer, and I have never liked that world. JavaScript as a language, and especially its ecosystem of NPM and tooling, has always been frustrating for me. Setting up a local Redash development environment felt like being a beginner again, and I failed repeatedly before I managed to get it working. Even on the Python side, I realized how little experience I have with poetry, something I should probably invest more time in. None of this was smooth, but in the end, the process reminded me that open source contributions often mean stepping outside your own specialization and pushing through the rough edges.

{% include gallery id="galleryFunctions" caption="Querying DuckDB functions with extensions loaded." %}

The integration has caveats, and it is worth being upfront about them. Autocomplete in Redash suggests fully qualified paths, including the default `main` schema, which makes the suggestions look verbose compared to the shorter queries DuckDB users normally write. It also does not currently work well with Duck Lake, and so far it has only been tested against DuckDB 0.9.x and above. While schema expansion and queries have been validated through unit and manual testing, there are no full end-to-end browser tests yet, so UI behavior under load remains uncertain.

Even with its limitations, the value of this integration is clear. DuckDB is excellent for embedded and local analytics, but until now it has mostly lived in notebooks, scripts, and CLI sessions. Redash adds a lightweight collaborative layer, with dashboards, visualizations, and even alerts. Together they occupy a middle ground: not a replacement for a full data warehouse and enterprise BI, but a way to query data in Parquet, CSV, or JSON, and turn results into shareable dashboards without moving the data anywhere else. For individuals or small teams this lowers friction and cost; for larger organizations it can serve as a prototyping stage before scaling to heavier infrastructure.

I am not affiliated with either DuckDB or Redash. I built this as a community member, because I like both projects and wanted them to work together. It is now part of Redash’s main repository, and I hope others will try it, share their experiences, and point out where it can improve. For me, it was another small piece of glue code — not polished, not perfect, but something that bridges a gap I personally needed. Contributing it back made the struggle worthwhile. If you use Redash and DuckDB, I would be glad to hear how it works for you, and where it might be improved further.
