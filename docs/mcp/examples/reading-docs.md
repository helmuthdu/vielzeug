---
title: Reading Docs
description: Access package documentation pages using the get-docs tool.
---

## Read documentation pages

### Default page (index)

Get the index documentation page for a package:

```json
{ "name": "get-docs", "arguments": { "packageSlug": "sieve" } }
```

### Specific page (api)

Get the API reference page:

```json
{ "name": "get-docs", "arguments": { "packageSlug": "sieve", "page": "api" } }
```

### Read source

Get the source code for a package:

```json
{ "name": "get-source", "arguments": { "packageSlug": "sieve" } }
```

Available pages include: `index`, `api`, `usage`, and `examples`.

