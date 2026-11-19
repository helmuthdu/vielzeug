---
title: 'Codex Examples: Searching Docs'
description: 'Section-level docs search example for @vielzeug/codex.'
---

## Searching Docs

### Problem

You want to find where a capability is documented (e.g. "retry", "virtual scrolling") without opening every page of every package.

### Solution

Use `search` with a free-text query. Search runs over documentation **sections**: every term must appear inside one section, and results are ranked by where they matched.

```json
{ "name": "search", "arguments": { "query": "retry backoff" } }
```

Result excerpt:

```json
[
  {
    "heading": "Retries and backoff",
    "page": "usage",
    "section": "retries-and-backoff",
    "slug": "courier",
    "snippet": "Courier retries failed requests with exponential backoff…"
  }
]
```

Follow up with `get-docs` and the `section` to fetch exactly the matching slice:

```json
{ "name": "get-docs", "arguments": { "page": "usage", "section": "retries-and-backoff", "slug": "courier" } }
```

#### No-match behavior

When nothing matches, the tool returns an empty array: not an error:

```json
[]
```

### Pitfalls

- Search covers the bundled docs, not live docs or source code. Terms added after the snapshot was cut will not appear.
- Matching is per-section AND: `"reactive signal"` only hits sections containing both terms. A term spread across a page does not match.
- Results are capped at the top ten hits; narrow the query if you hit the cap.
- The snapshot is versioned: the server `instructions` carry its version, so compare with the packages installed in your project.

### Related

- [Discovering Packages](./discovering-packages.md)
- [Reading Docs](./reading-docs.md)
- [Tool reference](../tools.md)
