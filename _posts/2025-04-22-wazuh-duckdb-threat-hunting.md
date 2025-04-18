---
title: "Practical Threat Hunting on Compressed Wazuh Logs with DuckDB"
tags:
  - Wazuh
  - SIEM
  - Detection
  - Duckdb
  - Threat Hunting
---

Threat hunting and incident response require timely, flexible access to logs — especially in environments where detection coverage or infrastructure maturity is still developing. In a mature detection engineering program, logs typically flow through a structured pipeline with three distinct outputs:

1. **Raw Logs to Cheap Storage**: Logs are written as-is to a low-cost location: NFS, SMB share, or object storage (e.g., S3). This supports long-term retention and full-fidelity replay.
2. **Structured Data Lake for Hunting**: Logs are parsed, transformed, normalized to schema, and stored in an efficient format like Parquet. This enables fast, large-scale querying, enrichment, and threat hunting.

3. **SIEM Pipeline**: High-value events are filtered, aggregated, and pushed to a SIEM. This supports real-time detection, alerting, and correlation.

---

<img src="/assets/duckdb-wazuh.png" width="800" alt="Screenshot of the DuckDB UI">

---

## The Reality: Compliance Archives Without Hunting Infrastructure

In most organizations, log storage practices are driven more by **compliance requirements** than by security operations. Long-term archives are retained on NFS, SMB shares, or S3 for years — but they are rarely optimized for investigation, threat hunting, or enrichment. The storage is cold, compressed, and flat.

Structured data lakes — where logs are parsed, normalized, and stored in analytics-friendly formats — are a **recent evolution** in detection engineering. They require:

- Parsing pipelines
- Schema governance
- Query layers
- Budget

As a result, **most teams don't have one**. This is not unusual — it reflects the current maturity curve of the industry.

Instead, many organizations still operate under a traditional model:

- Logs are collected
- Alert-worthy events are sent to the SIEM
- Everything else is archived in compressed files for compliance
- Removed after a retention period

That’s where I'd like to provide an alternative — providing a structured, analyst-friendly method for searching those cold, compressed logs during investigations. It won’t replace a data lake, but it dramatically improves what teams can do with the storage they already have.

---

## Wazuh Context: Where Logs Come From

I am mostly writing about Wazuh as it is the daily driver for our team. It is not a surprise that my example is based on it.

In Wazuh, all events are processed by the `wazuh-analysisd` daemon, which acts like a tee command — it splits output to multiple files:

In your `ossec.conf`, if you have `<logall>yes<\logall>`, it means you are getting logs as plain text.

- `/var/ossec/logs/archives/archives.log`: All decoded events — whether they triggered a rule or not
- `/var/ossec/logs/alerts/alerts.log`: Events that matched a rule above a configurable priority threshold

In your `ossec.conf`, if you have `<logall_json>yes<\logall_json>`, it means you are getting logs in JSON lines format.

- `/var/ossec/logs/archives/archives.json`: All decoded events — whether they triggered a rule or not
- `/var/ossec/logs/alerts/alerts.json`: Events that matched a rule above a configurable priority threshold

> First of all, we have an assumption hat you use JSON logs for archive. If you do not have `<logall_json>yes<\logall_json>` set, the rest is not helpful for you. Neither DuckDB nor Wazuh Indexer can help there. This is a strict requirement.

Organizations commonly rotate and compress these logs into `.log.gz` or `.json.gz` files for storage and retention. This creates two common approaches to historical access:

### Option 1: Push Archives to Wazuh Indexer (OpenSearch)

- Supports fast indexed search, dashboards, and alerting
- Integrates natively with the Wazuh dashboard
- The most user friendly and helpful method in the long run.

**Tradeoff:** High storage cost — compressed log files are often only ~14% the size of equivalent indexed data. At scale, this becomes a cost bottleneck.

### Option 2: Store Compressed Logs and Search as Needed

- Storage efficient
- Requires no ingestion infrastructure

**Tradeoff:** Poor searchability. Teams are stuck using `zgrep`, `zcat` + `grep`, `jq`, or ad hoc scripting to find events. But, it is possible to make it relatively a better experience. But is is still poorer than the Wazuh Indexer + Wazuh Dashboard combination.

---

## A Middle Ground: DuckDB as a Structured Search Layer

To improve the investigation experience without the overhead of a data lake or OpenSearch, we use **DuckDB**, a lightweight analytical SQL engine that:

- Runs in-process (no daemon or service)
- Reads JSON files -even if they are compressed- and infers schema automatically
- Supports timestamp comparisons, regex, JSON parsing
- Outperforms traditional tools for many query types

DuckDB lets us treat compressed log archives like a database table — but without ingesting, unpacking, or indexing them first.

---

## Performance Compared to Unix Tools

In [benchmark tests](https://duckdb.org/2024/06/20/cli-data-processing-using-duckdb-as-a-unix-tool.html), DuckDB consistently outperforms tools like `grep` or `awk` for filtering and aggregating **structured** data -i.e. CSV, JSON:

| Tool               | Runtime (Compressed) | Runtime (Uncompressed) |
|--------------------|----------------------|------------------------|
| grep 2.6.0-FreeBSD | 20.9s                | 20.5s                  |
| pcregrep 8.45      | 3.1s                 | 2.9s                   |
| DuckDB 1.0.0       | 4.2s                 | 1.2s                   |

On uncompressed data, DuckDB can fully parallelize queries, resulting in significant speedups. As queries grow more complex — involving joins, filtering, regex, or date logic — DuckDB’s performance and maintainability become even more valuable.

---

## Our Approach: Case-Oriented Analysis with DuckDB

We use a single local DuckDB database called `investigations.db`. Each investigation is represented as an SQL view, scoped by date and case name. Views are created and listed using lightweight Bash scripts:

### `create_view.sh`

<script src="https://gist.github.com/zbalkan/b6b6af0981698ae8c314a384aa3cbed3.js"></script>

```bash
./create_view.sh "SI-801" "2025-04-0*"
```

This is a very opinionated script. It assumes the user wants to track the case via a ticket number. Inside the script, there is the location of the logs with a naming convention. Creates a view named `si_801` pointing to `/NFS/2025-04-0*-siem*.log.gz`, where the view name is normalized ticket number and the file path pattern is hard coded.

The view exposes:

- `timestamp`
- `agent_id`, `agent_name`
- `location`
- `decoder`
- `full_log` (contains raw or pre-processed logs)

### `list_cases.sh`

<script src="https://gist.github.com/zbalkan/d02d46b88b23e6b60cd2193bc09382d4.js"></script>

```bash
./list_cases.sh
```

Lists all defined views and their SQL definitions for traceability. This helps after the team builds several cases.

---

## Example: Investigate Sysmon Activity on a Host

Once the view is created, open DuckDB:

```bash
duckdb investigations.db
```

Query logs from `win-lab01`, looking for Sysmon events within a specific time window:

```sql
SELECT *
FROM si_801
WHERE agent_name = 'win-lab01'
  AND regexp_matches(full_log, 'Microsoft-Windows-Sysmon')
  AND timestamp BETWEEN TIMESTAMP '2025-04-02 08:00:00' AND TIMESTAMP '2025-04-03 18:00:00';
```

You can extract structured values from the raw JSON using regex:

```sql
SELECT
  timestamp,
  regexp_extract(full_log, '"eventID": ?"(\d+)"', 1) AS event_id,
  regexp_extract(full_log, '"image": ?"([^"]+)"', 1) AS process_image
FROM si_801
WHERE regexp_matches(full_log, 'Microsoft-Windows-Sysmon');
```

After an investigation, you may want to export the results for documentation, ticketing, or further analysis. You can export either to CSV:

```sql
COPY (
    SELECT *
    FROM si_801
    WHERE agent_name = 'win-lab01'
) TO 'sysmon_results.csv' (HEADER, DELIMITER ',');
```

Or JSON:

```sql
COPY (
    SELECT *
    FROM si_801
) TO 'results.json' (FORMAT JSON);
```

or even Parquet -with [some performance tricks](https://github.com/duckdb/duckdb/discussions/6478):

```sql
SET preserve_insertion_order=false;
COPY (
    SELECT *
    FROM si_801
) TO 'results.pq' (FORMAT 'PARQUET',
                      CODEC  'Snappy',
                      PER_THREAD_OUTPUT TRUE);
```

These can be run in the DuckDB shell or using `duckdb -c` from the command line. Or you can just pipe to DuckDB like:

```shell
echo "SELECT *
    FROM si_801" | duckdb
```

You may prefer GUI over CLI. As of version 1.2.1, duckDB comes with a [simple UI](https://duckdb.org/2025/03/12/duckdb-ui.html). run `duckdb -ui` and provide the path to `investigations.db` file. In my lab, I created it under `/tmp`.

<img src="/assets/duckdb-ui.png" width="800" alt="Screenshot of the DuckDB UI">

Now, you can run them on a web UI easily. You can also try other [IDEs supporting DuckDB](https://github.com/davidgasquez/awesome-duckdb?tab=readme-ov-file#sql-clients-and-ide-that-support-duckdb) for a smoother experience.

If needed, teams can build lightweight wrappers to automate exports — though it’s not required.

DuckDB supports querying data and database files directly from Amazon S3 and S3-compatible APIs such as [MinIO](https://min.io/) or [Wasabi](https://wasabi.com/downloads).

```sql
INSTALL httpfs;
LOAD httpfs;

ATTACH 's3://my-bucket/investigations.db' AS remote;

SELECT * FROM remote.si_801 WHERE ...;
```

Only read access is supported for remote databases, but this allows for shared, cloud-based investigations or accessing long-term forensic archives without downloading files locally.

> To use this fully, you’ll need to slightly modify your view-generation or run queries directly in cloud environments.

---

## Conclusion

If you do not have a modern SOC with enough budget, most probably your environment lacks a full detection engineering pipeline with a structured data lake and scalable SIEM backend; this approach fills a critical operational gap.

- It supports structured queries on `.json.gz` Wazuh archives
- It offers a better investigation experience than `zgrep` or scripting
- It runs locally with no infrastructure and scales with investigator needs
- It integrates with remote storage like S3 if needed
- It’s portable, maintainable, and fast enough for real work

This isn’t a replacement for a SIEM or a data lake — but for many teams, it’s the most practical, cost-effective way to unlock their archived logs for threat hunting and investigations.

<img src="/assets/duckdb-parquet.png" width="800" alt="Logo of Apache Parquet file format">

You can move one more step ahead, and convert the logs to Apache [Parquet format](https://parquet.apache.org/). [DuckDB](https://duckdb.org/docs/stable/data/parquet/overview.html) not only allows reading and writing but also conversion to Parquet format. Since Parquet files are compressed during conversion, you do not need an extra step. That would allow indexing, so you can get faster `SELECT` queries. You can even make use of Parquet encryption. It is based on your creativity and hands-on experience. See [this discussion](https://github.com/duckdb/duckdb/discussions/6478) initiated by [Mark Litwintschik](https://tech.marksblogg.com/) for faster conversions
