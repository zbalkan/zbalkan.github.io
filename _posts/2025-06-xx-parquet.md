It is possible to store logs as parquet.

```bash
# Convert JSON logs whether compressed or not.
echo "COPY (
    SELECT
        CAST(timestamp AS TIMESTAMP) AS timestamp,
        agent.id AS agent_id,
        agent.name AS agent_name,
        location,
        decoder.name AS decoder,
        full_log
    FROM read_ndjson_auto('/var/ossec/logs/archives/*/*/*.json*', ignore_errors = true)
    WHERE timestamp IS NOT NULL
) TO 'results.pq' (
    FORMAT 'PARQUET',
    CODEC  'Snappy',
    COMPRESSION 'ZSTD',
    PER_THREAD_OUTPUT TRUE
);" | duckdb

# Query parquet easily
echo "SELECT * FROM read_parquet('results.pq/*');" | duckdb

```
