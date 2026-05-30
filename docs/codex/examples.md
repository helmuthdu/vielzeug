---
title: Codex — Examples
description: Practical MCP tool-call examples for package discovery, docs lookup, and Sigil component queries.
---

[[toc]]

## Examples

- [Listing Packages](./examples/listing-packages.md)
- [Searching Packages](./examples/searching-packages.md)
- [Package Metadata](./examples/package-metadata.md)
- [Looking Up Components](./examples/looking-up-components.md)
- [Reading Docs](./examples/reading-docs.md)
- [Inspector](./examples/inspector.md)

## Multi-step agent flow

A reliable AI-agent pattern:

1. `search-packages` with a domain intent (for example `"forms"`)
2. `list-packages` with `packageSlug` for structured metadata of the top candidate
3. `get-docs` with `page: "usage"`
4. `get-source` for exact exported signatures
