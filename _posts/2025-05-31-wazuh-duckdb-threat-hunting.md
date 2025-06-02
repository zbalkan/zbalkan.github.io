---
title: "Practical Threat Hunting on Compressed Logs with DuckDB"
tags:
  - Wazuh
  - SIEM
  - Detection
  - DuckDB
  - Threat Hunting
gallery7:
  - url: /assets/duckdb-query1.png
    image_path: /assets/duckdb-query1.png
gallery6:
  - url: /assets/duckdb-query2.png
    image_path: /assets/duckdb-query2.png
gallery7:
  - url: /assets/duckdb-query3.png
    image_path: /assets/duckdb-query3.png
gallery8:
  - url: /assets/duckdb-query4.png
    image_path: /assets/duckdb-query4.png
gallery9:
  - url: /assets/duckdb-query5.png
    image_path: /assets/duckdb-query5.png
gallery10:
  - url: /assets/duckdb-query6.png
    image_path: /assets/duckdb-query6.png
gallery11:
  - url: /assets/duckdb-query7.png
    image_path: /assets/duckdb-query7.png
gallery12:
  - url: /assets/duckdb-ui.png
    image_path: /assets/duckdb-ui.png
    alt: "Screenshot of the DuckDB UI"
last_modified_at: 2025-06-02T14:00:00+02:00
---

Threat hunting and incident response require timely, flexible access to logs - especially in environments where detection coverage or infrastructure maturity is still developing. In a mature detection engineering program, logs typically flow through a structured pipeline with three distinct outputs:

<img src="/assets/duckdb-pipeline.png" width="800" alt="A sample diagram for 3 targets of logs">

1. **Raw Logs to Cheap Storage**: Logs are written as-is to a low-cost location: NFS, SMB share, or object storage (e.g., S3). This supports long-term retention and full-fidelity replay.
2. **Structured Data Lake for Hunting**: Logs are parsed, transformed, normalized to schema, and stored in an efficient format like Parquet. This enables fast, large-scale querying, enrichment, and threat hunting.
3. **SIEM Pipeline**: High-value events are filtered, aggregated, and pushed to a SIEM. This supports real-time detection, alerting, and correlation.

This guide assumes familiarity with command‐line tools and SQL
{: .notice--info}

## The Reality: Compliance Archives Without Hunting Infrastructure

Have you ever noticed how most companies only think about log storage because of compliance—never for actual investigations? Those logs usually sit in cold, compressed archives on NFS or S3 buckets for years. Sure, they tick the regulatory boxes, but when it's time to hunt threats or enrich data, they feel useless—like a dusty filing cabinet you're afraid to open.

Lately, though, there's a newer approach: building organized "data lakes" that parse and normalize logs into formats analysts can query in seconds. But let's be real—that takes a lot of work: you need parsing pipelines, strict schema governance, powerful query layers, and a healthy budget. Most teams simply don't have all that. It's nothing personal—it just shows how early we are as an industry.

Instead, lots of organizations stick to the old-school method:

- Gather logs from everywhere.
- Send any "alert-worthy" events off to a SIEM.
- Shove everything else into compressed files for compliance's sake—then delete it when the retention clock runs out.

That's fine if you only care about ticking boxes. But what if you need to dig into those cold, compressed logs without reinventing your entire architecture? I'm not saying this replaces a full-blown data lake. What I'm offering is a structured, analyst-friendly way to search those old archives during an investigation. With this approach, you don't need to rebuild. You just get better mileage out of what's already sitting on tape or in cold storage.

## Wazuh Context: Where Logs Come From

<img src="/assets/duckdb-arch.png" width="600" alt="Archive and alert logs">

In Wazuh, all events are processed by the `wazuh-analysisd` daemon, which acts like a tee command - it splits output to multiple files:

In your `ossec.conf`, if you have `<logall>yes<\logall>`, it means you are getting logs as plain text.

- `/var/ossec/logs/archives/archives.log`: All decoded events - whether they triggered a rule or not
- `/var/ossec/logs/alerts/alerts.log`: Events that matched a rule above a configurable priority threshold

In your `ossec.conf`, if you have `<logall_json>yes<\logall_json>`, it means you are getting logs in [JSON lines](https://jsonlines.org/) format.

- `/var/ossec/logs/archives/archives.json`: All decoded events - whether they triggered a rule or not
- `/var/ossec/logs/alerts/alerts.json`: Events that matched a rule above a configurable priority threshold

First of all, we have an assumption that you use JSON logs for the log archival process. If you do not have `<logall_json>yes<\logall_json>` set, the rest is not helpful for you. Neither DuckDB nor Wazuh Indexer can help there. This is a strict requirement.
{: .notice--info}

Organizations commonly rotate and compress these logs into `.log.gz` or `.json.gz` files for storage and retention. This creates two common approaches to historical access that I will define below.

### Option 1: Push Archives to Wazuh Indexer (OpenSearch)

- Supports fast indexed search, dashboards, and alerting
- Integrates natively with the Wazuh dashboard
- The most user-friendly and helpful method in the long run.

**Tradeoff:** High storage cost - compressed log files -aka `.log.gz` files- are often only ~14% the size of equivalent indexed data. At scale, this becomes a cost bottleneck.

### Option 2: Store Compressed Logs and Search as Needed

- Storage efficient
- Requires no ingestion infrastructure

**Tradeoff:** Poor searchability. Teams are stuck using `zgrep`, `zcat` + `grep`, `jq`, or ad hoc scripting to find events. But, it is possible to make it relatively a better experience. But this is still a poorer experience than the Wazuh Indexer + Wazuh Dashboard combination.

As a side note, JSON log files are more verbose. It is expected to require 60-80% more storage usage when compressed.

## A Middle Ground: DuckDB as a Structured Search Layer

<img src="/assets/duckdb-wazuh.png" width="400" alt="Wazuh and DuckDB logos">

To improve the investigation experience without the overhead of a data lake or OpenSearch, we use **DuckDB**, a lightweight analytical SQL engine that:

- Runs in-process (no daemon or service)
- Reads JSON files -even if they are compressed- and infers schema automatically
- Supports timestamp comparisons, regex, JSON parsing
- Outperforms traditional tools for many query types

DuckDB lets us treat compressed log archives like a database table - but without ingesting, unpacking, or indexing them first.

## Performance Compared to Unix Tools

In [benchmark tests](https://duckdb.org/2024/06/20/cli-data-processing-using-duckdb-as-a-unix-tool.html), DuckDB consistently outperforms tools like `grep` or `awk` for filtering and aggregating **structured** data -i.e. CSV, JSON:

| Tool               | Runtime (Compressed) | Runtime (Uncompressed) |
|--------------------|----------------------|------------------------|
| grep 2.6.0-FreeBSD | 20.9s                | 20.5s                  |
| pcregrep 8.45      | 3.1s                 | 2.9s                   |
| DuckDB 1.0.0       | 4.2s                 | 1.2s                   |

On uncompressed data, DuckDB can fully parallelize queries, resulting in significant speedups. As queries grow more complex - involving joins, filtering, regex, or date logic - DuckDB's performance and maintainability become even more valuable.

## Our Approach: Case-Oriented Analysis with DuckDB

While this guide uses Wazuh as the example JSON source, the same DuckDB pattern works on any agent or pipeline that emits line-delimited JSON—so long as you have a folder or bucket of `.json.gz` (or `.json`) files, you can follow these steps regardless of your EDR/SIEM vendor.

Our approach starts with an assumption that we store large amount of data for a long time, at least a year. Therefore it is not wise to start searching TBs of compressed logs for all queries. Filesystem is not a database, so we extract the logs needed for the investigation, not more. We use a single local DuckDB database called `investigations.db`. Each investigation is represented as an SQL view, scoped by date and case name. Views are created and listed using lightweight Bash scripts:

**`create_view.sh`**

<script src="https://gist.github.com/zbalkan/b6b6af0981698ae8c314a384aa3cbed3.js"></script>

```bash
./create_view.sh "SI-801" "2025-04-0*"
```

This is a very opinionated script. It assumes the user wants to track the case via a ticket number. Inside the script, there is the location of the logs with a naming convention. Creates a view named `si_801` pointing to `/archives/2025-04-0*-siem*.log.gz`, where the view name is normalized ticket number and the file path pattern is hard coded.

The view exposes:

- `timestamp`
- `agent_id`, `agent_name`
- `location`
- `decoder`
- `full_log` (contains raw or pre-processed logs)

**`list_cases.sh`**

<script src="https://gist.github.com/zbalkan/d02d46b88b23e6b60cd2193bc09382d4.js"></script>

This script does not accept any parameters, and it is easy to use. You can skip it if you want to use UI options that I'll mention later.

```bash
./list_cases.sh
```

Lists all defined views and their SQL definitions for traceability. This helps after the team builds several cases.

## Example: Investigate Sysmon Activity on a Host

This section is not a **Threat hunting 101** class. The following section demonstrates DuckDB capabilities to query Wazuh archive logs with a simple use case. The rest depends on your investigation, regex and SQL skills.
{: .notice--info}

<img src="/assets/duckdb-lab.png" width="600" alt="Lab design">

For the sake of a common understanding, let's assume that `SI-801` is initiated by a high severity alert on Wazuh: a Sysmon Event ID 1 Process Create record appears in real-time Windows Event logs showing `parentImage = C:\Windows\System32\mshta.exe` spawning `calc.exe` on `WIN-LAB01`. Since mshta is a known [LOLBIN](https://lolbas-project.github.io/) (Living Off The Land Binary and Script) commonly abused for fileless payloads, the custom alert flags this as suspicious. This assumes that the device may have been compromised, and analyst wants to ensure if this is a false positive or worth an investigation before initiate response actions. The analyst used the scripts above to extract the logs in the timeframe needed. The analyst decides the timeframe of the investigation, probably starting with an arbitrary date and ending at the time of investigation.

```bash
./create_view.sh "SI-801" "2025-06-0*"
```

Once the view is created following the steps in the previous section, open DuckDB:

```bash
duckdb investigations.db
```

At this point, you can use SQL query with wildcard or regex to search in `full_log` fields. DuckDB regex uses Google's RE2, and for regex syntax, check [RE2 docs](https://github.com/google/re2/wiki/Syntax). You can also try to use [JSON query capabilities of DuckDB](https://duckdb.org/docs/stable/data/json/json_functions.html), if you are sure that the logs in the `full_log` fields are already in JSON format. Since Wazuh agent for Windows converts Windows event logs to JSON on the agent side, we can use JSON query methods for Sysmon for our example.

As a side note, I must mention that if we were using other log sources such as `auditd`, which is not JSON formatted, we must have used regex. For instance;

```sql
SELECT
  timestamp,
  regexp_extract(full_log, 'type=USER_ACCT msg=.*?acct="([^"]+)"', 1)    AS user_name,
  regexp_extract(full_log, 'pid=([0-9]+)', 1)                            AS pid,
  regexp_extract(full_log, 'exe="([^"]+)"', 1)                            AS executable
FROM si_801
WHERE agent_name = 'win-lab01'
  AND full_log LIKE '%auditd%' -- only auditd lines
  AND timestamp BETWEEN TIMESTAMP '2025-06-01 08:00:00'
                    AND TIMESTAMP '2025-06-02 18:00:00'
  AND regexp_matches(full_log, 'type=USER_ACCT');  -- restrict to "USER_ACCT" events
```

After this reminder, let's stick to our scenario and use JSON capabilities. So, to simplify the future queries, I want to create another view, that parses only the logs I care, the ones from the agent name and formatted as Windows Event Logs.

```sql
CREATE OR REPLACE VIEW si_801_json AS
    SELECT
        CAST("timestamp" AS TIMESTAMP) AS "timestamp",
        agent.id AS agent_id,
        agent."name" AS agent_name,
        "location",
        decoder."name" AS decoder,
        full_log
    -- Wrapping the path as a single item list so that we can add new files as:
    -- read_ndjson_auto(main.list_value("./2025-06-01-siem1.json.gz", "other file", "one more file") ...
    -- Or we could have used a GLOB pattern
    -- read_ndjson_auto("./2025-06-0*-*.json.gz")
    FROM read_ndjson_auto(main.list_value("./2025-06-01-siem1.json.gz"), (ignore_errors = true))
    -- Get all Windows event logs from single endpoint
    WHERE agent_name = 'win-lab01'
        AND json_valid(full_log)
        AND location = 'EventChannel';
```

Query logs from `win-lab01`, looking for Sysmon events within a specific time window:

```sql
-- Retrieve all fields for any Sysmon event on win-lab01 between the specified window
SELECT *
FROM si_801_json
WHERE json_extract_string(full_log, '$.win.system.providerName') = 'Microsoft-Windows-Sysmon'
  AND timestamp BETWEEN TIMESTAMP '2025-06-01 08:00:00' AND TIMESTAMP '2025-06-02 18:00:00';
```

{% include gallery id="gallery5" caption="Sysmon events within a timeframe" %}

Or we can extract the fields we care:

```sql
WITH sysmon_events AS (
  SELECT
    timestamp,
    json_extract_string(full_log, '$.win.eventdata.image') AS image,
    json_extract_string(full_log, '$.win.eventdata.parentImage') AS parent_image,
    json_extract_string(full_log, '$.win.eventdata.parentCommandLine') AS parent_cmd,
    json_extract_string(full_log, '$.win.eventdata.commandLine') AS cmdline
  FROM si_801_json
  WHERE
    json_extract_string(full_log, '$.win.system.providerName') = 'Microsoft-Windows-Sysmon'
    AND json_extract_string(full_log, '$.win.system.eventID') = '1'
)
SELECT *
FROM sysmon_events
WHERE timestamp BETWEEN TIMESTAMP '2025-06-01 08:00:00'
                  AND TIMESTAMP '2025-06-02 18:00:00';
```

{% include gallery id="gallery6" caption="Extracting fields" %}

Let's assume you are looking for an anomaly in parent-child process relationships:

```sql
-- Count how many times each parentImage appears among all Sysmon EventID=1 records
SELECT
  parent_image,
  COUNT(*) AS event_count
FROM (
  SELECT
    json_extract_string(full_log, '$.win.eventdata.parentImage') AS parent_image
  FROM si_801_json
  WHERE agent_name = 'win-lab01'
    AND json_extract_string(full_log, '$.win.system.providerName') = 'Microsoft-Windows-Sysmon'
    AND json_extract_string(full_log, '$.win.system.eventID') = '1'
) AS sub
GROUP BY parent_image
ORDER BY event_count DESC;
```

{% include gallery id="gallery7" caption="Parent-child process relationships" %}

You can use different ways to understand the behaviors. You can have hourly buckets for analysis:

```sql
-- Bucket Process-Create (EventID=1) timestamps by the hour
WITH sysmon1 AS (
  SELECT
    timestamp AS ts
  FROM si_801_json
  WHERE agent_name = 'win-lab01'
    AND json_extract_string(full_log, '$.win.system.providerName') = 'Microsoft-Windows-Sysmon'
    AND json_extract_string(full_log, '$.win.system.eventID') = '1'
)
SELECT
  date_trunc('hour', ts) AS hour_bucket,
  COUNT(*)               AS event_count
FROM sysmon1
GROUP BY hour_bucket
ORDER BY hour_bucket;
```

{% include gallery id="gallery8" caption="Sysmon Event ID 1 per hour" %}

Or, you can try to find top child processes by parent process:

```sql
-- Show, for each parentImage, which child processes it spawned most often
WITH extracted AS (
  SELECT
    json_extract_string(full_log, '$.win.eventdata.parentImage') AS parent_image,
    json_extract_string(full_log, '$.win.eventdata.image') AS image
  FROM si_801_json
  WHERE agent_name = 'win-lab01'
    AND json_extract_string(full_log, '$.win.system.providerName') = 'Microsoft-Windows-Sysmon'
    AND json_extract_string(full_log, '$.win.system.eventID') = '1'
)
SELECT
  parent_image,
  image       AS child_image,
  COUNT(*)    AS count_child
FROM extracted
GROUP BY parent_image, child_image
ORDER BY parent_image, count_child DESC;
```

{% include gallery id="gallery9" caption="Top child processes by parent process" %}

You can simply search for the sucpicious process:

```sql
-- Identify the commandLine arguments that mshta.exe used, and how often
SELECT
  -- JSON extraction of the child’s command line
  json_extract_string(full_log, '$.win.eventdata.commandLine') AS cmdline,
  COUNT(*)                                        AS invocation_count
FROM si_801_json
WHERE agent_name = 'win-lab01'
  -- JSON filter for Sysmon providerName
  AND json_extract_string(full_log, '$.win.system.providerName') = 'Microsoft-Windows-Sysmon'
  -- JSON filter for EventID = "1"
  AND json_extract_string(full_log, '$.win.system.eventID') = '1'
  -- JSON filter for parentImage == mshta.exe
  AND ((json_extract_string(full_log, '$.win.eventdata.parentImage') = 'C:\\Windows\\System32\\mshta.exe') OR
  (json_extract_string(full_log, '$.win.eventdata.parentImage') = 'C:\\Windows\\SysWOW64\\mshta.exe'))
  -- We could have written this keyword search with regex pattern:
  -- AND regexp_matches(full_log, '\"win\\.eventdata\\.parentImage\".*mshta\\.exe')
GROUP BY cmdline
ORDER BY invocation_count DESC;
```

{% include gallery id="gallery10" caption="Command line arguments with mshta.exe" %}

But the best and most popular usage would by building a process tree. We first query the ancestors, then descendants and join them:

```sql
-- Build a deduplicated process tree (ancestors + descendants) by ProcessGUID
WITH RECURSIVE

  -- 1. Define the single parameter we’ll use throughout: the target process GUID.
  --    By putting it in a small CTE, we make it easy to substitute or reuse elsewhere
  --    without hard-coding the GUID multiple times.
  params AS (
    SELECT
      '{480c9770-8384-683c-1f33-010000002103}'            AS target_guid
  ),

  -- 2. "ancestors" CTE: climb from the target process up through its parents.
  --    We use a recursive CTE because we don’t know in advance how many generations
  --    of parents may exist. Each recursion step finds the next parent.
  ancestors AS (
    -- Anchor member: grab the row for the exact process GUID we care about.
    --   - depth = 0 marks this as our starting point ("anchor").
    --   - direction = 'anchor' lets us tag this row so it can be sorted/filtered later.
    SELECT
      s.timestamp                                                      AS ts,
      json_extract_string(s.full_log, '$.win.eventdata.processGuid')       AS proc_guid,
      json_extract_string(s.full_log, '$.win.eventdata.parentProcessGuid') AS parent_pguid,
      json_extract_string(s.full_log, '$.win.eventdata.parentImage')       AS parent_image,
      json_extract_string(s.full_log, '$.win.eventdata.image')             AS process_image,
      0                                                                AS depth,        -- starting depth
      'anchor'                                                         AS direction    -- label for sorting/logic
    FROM si_801_json AS s
    CROSS JOIN params AS p
    WHERE
      -- Only consider Sysmon "Process Create" events to reliably get parent/child info.
      json_extract_string(s.full_log, '$.win.system.providerName')   = 'Microsoft-Windows-Sysmon'
      AND json_extract_string(s.full_log, '$.win.eventdata.processGuid') = p.target_guid

    UNION ALL

    -- Recursive member: find the parent row for each ancestor we already found.
    --   - Join on c.processGuid = anc.parent_pguid to climb one level upward.
    --   - Increment depth with each step so we know how far from the anchor we are.
    --   - Keep the same filters so we only pull legitimate Sysmon "Process Create" logs.
    SELECT
      c.timestamp                                                      AS ts,
      json_extract_string(c.full_log, '$.win.eventdata.processGuid')       AS proc_guid,
      json_extract_string(c.full_log, '$.win.eventdata.parentProcessGuid') AS parent_pguid,
      json_extract_string(c.full_log, '$.win.eventdata.parentImage')       AS parent_image,
      json_extract_string(c.full_log, '$.win.eventdata.image')             AS process_image,
      anc.depth + 1                                                    AS depth,        -- climb one generation
      'ancestor'                                                       AS direction    -- mark as ancestor
    FROM ancestors AS anc
    JOIN si_801_json AS c
      ON json_extract_string(c.full_log, '$.win.eventdata.processGuid') = anc.parent_pguid
    CROSS JOIN params AS p
    WHERE
      json_extract_string(c.full_log, '$.win.system.providerName')  = 'Microsoft-Windows-Sysmon'
      AND json_extract_string(c.full_log, '$.win.system.eventID')       = '1'
      -- "eventID=1" ensures we’re grabbing only Process Create records (which contain parent info)
  ),

  -- 3. "descendants" CTE: walk downward from the target to find all children, grandchildren, etc.
  --    Again, use recursion because we don’t know the fan-out depth a priori.
  descendants AS (
    -- Anchor member: same target row as before. We mark depth=0 and direction='descendant'.
    --   We’ll exclude this anchor from the final descendant list later so it’s not duplicated.
    SELECT
      s.timestamp                                                      AS ts,
      json_extract_string(s.full_log, '$.win.eventdata.processGuid')       AS proc_guid,
      json_extract_string(s.full_log, '$.win.eventdata.parentProcessGuid') AS parent_pguid,
      json_extract_string(s.full_log, '$.win.eventdata.parentImage')       AS parent_image,
      json_extract_string(s.full_log, '$.win.eventdata.image')             AS process_image,
      0                                                                AS depth,
      'descendant'                                                     AS direction
    FROM si_801_json AS s
    CROSS JOIN params AS p
    WHERE
      json_extract_string(s.full_log, '$.win.system.providerName')   = 'Microsoft-Windows-Sysmon'
      AND json_extract_string(s.full_log, '$.win.eventdata.processGuid') = p.target_guid

    UNION ALL

    -- Recursive member: find rows where the parentProcessGuid equals the proc_guid of the previous level.
    --   - This finds any immediate children of the current row, then increments depth.
    --   - Again, filter on Sysmon Process Create events for reliable hierarchy data.
    SELECT
      c.timestamp                                                      AS ts,
      json_extract_string(c.full_log, '$.win.eventdata.processGuid')       AS proc_guid,
      json_extract_string(c.full_log, '$.win.eventdata.parentProcessGuid') AS parent_pguid,
      json_extract_string(c.full_log, '$.win.eventdata.parentImage')       AS parent_image,
      json_extract_string(c.full_log, '$.win.eventdata.image')             AS process_image,
      d.depth + 1                                                      AS depth,
      'descendant'                                                     AS direction
    FROM descendants AS d
    JOIN si_801_json AS c
      ON json_extract_string(c.full_log, '$.win.eventdata.parentProcessGuid') = d.proc_guid
    CROSS JOIN params AS p
    WHERE
      json_extract_string(c.full_log, '$.win.system.providerName')  = 'Microsoft-Windows-Sysmon'
      AND json_extract_string(c.full_log, '$.win.system.eventID')       = '1'
  )

-- 4. Final SELECT: union ancestors and descendants into one timeline,
--    tagging each row with a numeric "dir_rank" so we can sort anchors first, then ancestors, then descendants.
SELECT
  ts,
  parent_image,
  process_image,
  depth,
  direction,
  CASE direction
    WHEN 'anchor'     THEN 0
    WHEN 'ancestor'   THEN 1
    WHEN 'descendant' THEN 2
    ELSE 3
  END AS dir_rank      -- numeric ordering to ensure anchor appears before ancestors/descendants at the same ts
FROM ancestors

UNION ALL

SELECT
  ts,
  parent_image,
  process_image,
  depth,
  direction,
  CASE direction
    WHEN 'anchor'     THEN 0
    WHEN 'ancestor'   THEN 1
    WHEN 'descendant' THEN 2
    ELSE 3
  END AS dir_rank
FROM descendants
WHERE depth > 0       -- exclude the "anchor" row from the descendant side to prevent duplicate

-- 5. ORDER BY:
--    - ts           -> so the entire tree is chronologically ordered.
--    - dir_rank     -> ensures anchor (0) comes first, then ancestors (1) sorted by depth, 
--                     and descendants (2) sorted afterwards.
--    - depth        -> within the same direction and timestamp, closer generations (lower depth) come first 
ORDER BY
  ts,
  dir_rank,
  depth;

```

We can end up with a table like this:

{% include gallery id="gallery11" caption="Process tree" %}

After the investigation is completed, you may want to export the results for documentation, ticketing, or further analysis. You can export either to CSV or JSON:

```sql
-- Export all Sysmon (EventID=1) rows for win-lab01 to CSV
COPY (
    SELECT *
    FROM si_801_json
    WHERE json_extract_string(full_log, '$.win.system.providerName') = 'Microsoft-Windows-Sysmon'
      AND json_extract_string(full_log, '$.win.system.eventID') = '1'
) TO 'sysmon_results.csv' (HEADER, DELIMITER ',');

-- Export the same to JSON
COPY (
    SELECT *
    FROM si_801_json
    WHERE json_extract_string(full_log, '$.win.system.providerName') = 'Microsoft-Windows-Sysmon'
      AND json_extract_string(full_log, '$.win.system.eventID') = '1'
) TO 'sysmon_results.json' (FORMAT JSON);
```

All these commands above can be run in the DuckDB shell or using `duckdb -c` from the command line. The third way is that you can just pipe to DuckDB such as:

```shell
echo "SELECT *
    FROM si_801_json" | duckdb
```

You may prefer GUI over CLI. As of version 1.2.1, DuckDB comes with a [simple UI](https://duckdb.org/2025/03/12/duckdb-ui.html). Run `duckdb -ui` and provide the path to `investigations.db` file. In my lab, I created it under `/tmp`. See the sample UI here:

{% include gallery id="gallery12" caption="Screenshot of the DuckDB UI" %}

Now, you can run them on a web UI easily. You can also try other [IDEs supporting DuckDB](https://github.com/davidgasquez/awesome-duckdb?tab=readme-ov-file#sql-clients-and-ide-that-support-duckdb) for a smoother experience.

If needed, teams can build lightweight wrappers to automate exports - though it's not required.

DuckDB supports querying data and database files directly from Amazon S3 and S3-compatible APIs such as [MinIO](https://min.io/) or [Wasabi](https://wasabi.com/downloads).

```sql
INSTALL httpfs;
LOAD httpfs;

ATTACH 's3://my-bucket/investigations.db' AS remote;

SELECT * FROM remote.si_801_json WHERE ...;
```

Only read access is supported for remote databases, but this allows for shared, cloud-based investigations or accessing long-term forensic archives without downloading files locally.

To use this fully, you'll need to slightly modify your view-generation or run queries directly in cloud environments.
{: .notice--info}

## Conclusion

Most teams simply cannot afford to spend months building big data lakes and heavy pipelines for SIEM. Wazuh stays minimalist: lightweight agents, simple deployment, and wide visibility into anything from file integrity to vulnerability scans without even slightly degrading system performance. When it comes to logs, if Wazuh is configured for JSON log writing, one can set up and run SQL queries on compressed `.json.gz` files using DuckDB without having extra ingestion, indexing, or schema design. DuckDB is a single binary itself reading files in-place, so one can explore old logs with meagre hardware or even query in S3 without building pipelines. It is not a complete replacement for a fully-fledged SIEM or data lake: you'll miss out on some of that convenience offered by full-text searches. That said, it may be the most straightforward and low-overhead solution when one needs to quickly look into the archives from yesterday or last week.

## Postscriptum

While I was preparing the article, DuckDB released a data lake solution called [DuckLake](https://duckdb.org/2025/05/27/ducklake.html), where they create data lake house management layer built on SQL. It looks like an amazing solution but not for the problem we have. I considered including that solution in the article -that's why I was late to publish, but the simple nature of Wazuh archive logs, where everything is in the `full_log` field, does not require the complexity overhead. It would have worked great if all the logs were parsed and converted to JSON properly though. Therefore, it is not used as is. But you can give it a try.
