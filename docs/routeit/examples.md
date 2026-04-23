---
title: Routeit — Examples
description: Practical, v3-accurate examples and recipes for Routeit.
---

# Routeit Examples

[[toc]]

## How to Use These Examples

These examples are aligned with the current declarative Routeit API (`defineRoutes()` + `createRouter({ routes })`).

1. Start with the route table basics.
2. Add middleware guards and fallback routes.
3. Use helper patterns for base paths, deduplication, and transitions.

For full signatures, keep the [API Reference](./api.md) open while adapting snippets.

## Examples Overview

- [Route Table Basics](./examples/route-table-basics.md)
- [Auth and Guards](./examples/auth-and-guards.md)
- [Not Found and Error Boundary](./examples/not-found-and-error-boundary.md)
- [Base Path Deployment](./examples/base-path-deployment.md)
- [Path Escape Hatches](./examples/path-escape-hatches.md)
- [Same-URL Deduplication](./examples/same-url-deduplication.md)
- [Page Titles from Meta](./examples/page-titles-from-meta.md)
- [View Transitions](./examples/view-transitions.md)

## Legacy Notes

Older Routeit docs and examples referenced an imperative API (`on()`, `group()`, `use()`).
Current Routeit uses a route-table-first model and named navigation. Prefer the pages above when implementing new code.
