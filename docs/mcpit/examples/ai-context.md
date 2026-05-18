---
title: AI Context
description: Get structured package metadata and AI integration context for a package.
---

## Get structured package metadata

Retrieve comprehensive metadata about a specific package:

```json
{ "name": "get-package", "arguments": { "packageSlug": "fetchit" } }
```

Result excerpt:

```json
{
  "name": "@vielzeug/fetchit",
  "slug": "fetchit",
  "category": "http",
  "exports": ["createApi", "createQuery", "createMutation"],
  "related": ["validit", "stateit", "deposit"],
  "availableDocPages": ["index", "api", "usage", "examples"],
  "hasSource": true
}
```

## Get AI context

Get enriched context for AI agents:

```json
{ "name": "get-ai-context", "arguments": { "packageSlug": "fetchit" } }
```

This provides additional semantic context for AI-powered code generation and recommendations.

