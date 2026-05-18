---
title: Reading Docs
description: Access package documentation pages using the get-docs tool.
---

## Read documentation pages

### Default page (index)

Get the index documentation page for a package:

```json
{ "name": "get-docs", "arguments": { "packageSlug": "validit" } }
```

### Specific page (api)

Get the API reference page:

```json
{ "name": "get-docs", "arguments": { "packageSlug": "validit", "page": "api" } }
```

### Read source

Get the source code for a package:

```json
{ "name": "get-source", "arguments": { "packageSlug": "validit" } }
```

Available pages include: `index`, `api`, `usage`, and `examples`.

