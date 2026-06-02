---
title: 'Codex Examples — Searching Packages'
description: 'Searching packages example for @vielzeug/codex.'
---

## Searching Packages

### Problem

You want to find which Vielzeug packages relate to a capability (e.g. "validation", "routing", "drag") without iterating the full catalog manually.

### Solution

Use `search-packages` with a free-text query. Results are ranked by where the term appears — metadata matches score highest, keyword matches next, docs and source last.

```json
{ "name": "search-packages", "arguments": { "query": "validation" } }
```

Result excerpt:

```json
[
  {
    "name": "@vielzeug/spell",
    "slug": "spell",
    "score": 3,
    "matchedIn": ["metadata", "keywords"]
  },
  {
    "name": "@vielzeug/forge",
    "slug": "forge",
    "score": 1,
    "matchedIn": ["docs"],
    "matchedPages": ["usage", "examples"]
  }
]
```

- `score` — 3 for metadata, 2 for keywords, 1 for docs/source
- `matchedIn` — every category where the query was found
- `matchedPages` — specific doc pages (and/or `"source"`) that matched; present when `matchedIn` includes `"docs"`

#### No-match behavior

When nothing matches, the tool returns an empty array — not an error:

```json
[]
```

### Pitfalls

- Search is case-insensitive but not stemmed. `"validat"` matches `"validation"` because it is a substring; `"validates"` may not match `"validator"`.
- A `score` of 1 means the term appeared somewhere in the docs or source, not necessarily in a prominent position. Follow up with `get-docs` to confirm relevance.
- The tool searches the bundled snapshot, not live docs. A term added to docs after the snapshot was cut will not appear in results.

### Related

- [Listing Packages](./listing-packages.md)
- [Package Metadata](./package-metadata.md)
- [API Reference — search-packages](../api.md#search-packages)
