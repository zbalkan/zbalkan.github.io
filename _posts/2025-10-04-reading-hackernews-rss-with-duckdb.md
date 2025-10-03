---
title: "Reading Hacker News RSS with DuckDB"
tags:
  - Database
  - DuckDB
  - Tips & Tricks
galleryPure:
  - url: /assets/hackernews-python.png
    image_path: /assets/hackernews-python.png
galleryUdf:
  - url: /assets/hackernews-udf.png
    image_path: /assets/hackernews-udf.png
gallerySQL:
  - url: /assets/hackernews-duckdb.png
    image_path: /assets/hackernews-duckdb.png
---

I saw a post on [Hacker News](https://news.ycombinator.com/), [In Praise of RSS and Controlled Feeds of Information](https://blog.burkert.me/posts/in_praise_of_syndication/). As a master procrastinator, I postponed my actual task and decided to try something smaller but more attractive: reading RSS feeds with [DuckDB](https://duckdb.org/).

I started with the simplest path: pure Python.

```python
import requests
import xml.etree.ElementTree as ET

def rss_viewer(url: str, limit: int):
    resp = requests.get(url)
    resp.raise_for_status()
    root = ET.fromstring(resp.text)
    channel = root.find("channel")

    items = []
    for item in channel.findall("item")[:limit]:
        items.append({
            "title": item.findtext("title"),
            "pubDate": item.findtext("pubDate"),
            "comments": item.findtext("comments"),
        })
    return items

if __name__ == "__main__":
    url = "https://news.ycombinator.com/rss"
    feed = rss_viewer(url, limit=25)

    print("\nLatest RSS items:\n")
    for entry in feed:
        print(f"- {entry['pubDate']} | {entry['title']}")
        print(f"  {entry['comments']}")
```

{% include gallery id="galleryPure" caption="Results from pure Python" %}

It worked fine. But I wanted to see DuckDB in action. Since DuckDB can already read remote text, CSV, JSON, Parquet, and even Excel, it seemed natural to try replacing `requests` with `read_text`. That’s when I hit a counterintuitive wall: DuckDB does not parse XML. Suddenly the DuckDB approach was more complex than pure Python.

The workaround was to write a small UDF that converts XML to JSON, which DuckDB can query natively.

```python
import duckdb, xml.etree.ElementTree as ET, json

def xml2json(xml_str: str) -> str:
    root = ET.fromstring(xml_str)
    channel = root.find("channel")
    items = []
    for item in channel.findall("item"):
        items.append({
            "title": item.findtext("title"),
            "pubDate": item.findtext("pubDate"),
            "comments": item.findtext("comments"),
        })
    return json.dumps(items)

con = duckdb.connect()

# Read XML
xml_str = con.execute("""
    SELECT string_agg(content, '')
    FROM read_text('https://news.ycombinator.com/rss')
""").fetchone()[0]

# Convert to JSON
json_str = xml2json(xml_str)

# Create relation with params
rel = con.query("""
    SELECT 
        x.value->>'title'    AS title,
        x.value->>'pubDate'  AS pubDate,
        x.value->>'comments' AS link
    FROM json_each(?::JSON) AS x
    ORDER BY strptime(x.value->>'pubDate', '%a, %d %b %Y %H:%M:%S %z') DESC
    LIMIT 25
""", params=[json_str])

rel.show()
```

{% include gallery id="galleryUdf" caption="Results from Python UDF with DuckDB" %}

It worked, but it felt clunky. A clever trick, yes, but heavier than I wanted. Then I discovered services like [rssjson.com](https://rssjson.com/), which convert RSS to JSON on the fly. That simplified things. With DuckDB’s CLI, I could skip the Python detour.

```SQL
FROM (
  SELECT rss_item.*
  FROM (
    SELECT unnest(parsedJson.rss.channel.item) AS rss_item
    FROM read_json('https://rssjson.com/api/v1/convert/https%3A%2F%2Fnews.ycombinator.com%2Frss')
  )
)
SELECT 
  strptime(pubDate, '%a, %d %b %Y %H:%M:%S %z') AS timestamp,
  title,
  comments AS link
ORDER BY timestamp DESC
LIMIT 30;
```

At that point it was easy to keep. I just opened a small database and created a view so I wouldn’t have to rewrite the query next time:

```bash
duckdb hackernews.db
```

```sql
CREATE OR REPLACE VIEW hackernews AS
FROM (
  SELECT rss_item.*
  FROM (
    SELECT unnest(parsedJson.rss.channel.item) AS rss_item
    FROM read_json(
      'https://rssjson.com/api/v1/convert/https%3A%2F%2Fnews.ycombinator.com%2Frss'
    )
  )
)
SELECT 
  strptime(pubDate, '%a, %d %b %Y %H:%M:%S %z') AS timestamp,
  title,
  comments AS link
ORDER BY timestamp DESC
LIMIT 25;
```

Now I can just run:

```bash
duckdb hackernews.db "FROM hackernews;"
```

And the latest Hacker News feed shows up immediately. Thanks to [Friendly SQL](https://duckdb.org/docs/stable/sql/dialect/friendly_sql.html) dialect, we can omit `SELECT *`.

{% include gallery id="gallerySql" caption="Results from pure DuckDB solution" %}

In the end, this wasn’t about building a reader or replacing RSS clients. It was about bending DuckDB in a direction it wasn’t designed for and seeing how far it could go. I like DuckDB because it makes small data fun again: quick to set up, light to use, and surprisingly flexible when you throw odd formats at it. Experiments like this remind me that not everything has to scale to petabytes or enterprise BI. Sometimes it’s enough to take a tiny dataset—like an RSS feed—and enjoy how easily DuckDB turns it into something queryable. That’s why I keep coming back to it.
