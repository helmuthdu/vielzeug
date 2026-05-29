---
title: Searching Packages
description: Search for packages by capability or domain using the search-packages tool.
---

## Search by capability

Find packages related to validation:

```json
{ "name": "search-packages", "arguments": { "query": "validation" } }
```

Result excerpt:

```json
[
  { "name": "@vielzeug/sieve", "slug": "sieve", "matchedIn": "metadata" }
]
```

### No-match behavior

When no packages match your search query:

```json
[]
```

