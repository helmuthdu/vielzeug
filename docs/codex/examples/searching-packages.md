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
    "score": 3.9,
    "matchedIn": ["metadata", "keywords"]
  },
  {
    "name": "@vielzeug/forge",
    "slug": "forge",
    "score": 1.0,
    "matchedIn": ["docs"],
    "matchedPages": ["usage", "examples"]
  }
]
```

- `score` — floating-point weight: 3.9 (name) > 3.5 (category) > 3.1 (description) > 2.5 (keywords) > 2.2 (exports) > 2.0 (related) > 1.0 (docs) > 0.9 (source)
- `matchedIn` — every category where the query was found
- `matchedPages` — specific doc pages that matched; present when `matchedIn` includes `"docs"`

#### No-match behavior

When nothing matches, the tool returns an empty array — not an error:

```json
[]
```

### Pitfalls

- Search is case-insensitive and normalises hyphens to spaces: `"my-pkg"` matches a package named `"@vielzeug/my-pkg"`. It is not stemmed — `"validat"` matches `"validation"` as a substring; `"validates"` may not match `"validator"`.
- A `score` of 1 means the term appeared somewhere in the docs or source, not necessarily in a prominent position. Follow up with `get-docs` to confirm relevance.
- The tool searches the bundled snapshot, not live docs. Terms added to docs after the snapshot was cut will not appear in results.
- Multi-word queries use AND logic within each field: `"reactive signal"` must appear together in the same field to produce a metadata-tier score.

### Related

- [Listing Packages](./listing-packages.md)
- [Package Metadata](./package-metadata.md)
- [API Reference — search-packages](../api.md#search-packages)
