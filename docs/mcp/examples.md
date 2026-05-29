---
title: Mcp — Examples
description: Practical MCP tool-call examples for package discovery, docs lookup, and Block component queries.
---

[[toc]]

## Examples

- [Listing Packages](./examples/listing-packages.md)
- [Searching Packages](./examples/searching-packages.md)
- [AI Context](./examples/ai-context.md)
- [Looking Up Components](./examples/looking-up-components.md)
- [Reading Docs](./examples/reading-docs.md)
- [Inspector](./examples/inspector.md)

## Multi-step agent flow

A reliable AI-agent pattern:

1. `search-packages` with domain intent (for example `"forms"`)
2. `get-package` for top candidate
3. `get-docs` with `page: "usage"`
4. `get-source` for exact exported signatures

