---
title: Codex — MCP Tools
description: Generic and Refine tool tables generated from the compiled tool registries.
---

[[toc]]

## Generic Tools

<!-- TOOLS:GENERIC:START -->
| Tool | Input | Description |
| --- | --- | --- |
| `list-packages` | — | List every Vielzeug package. |
| `get-package` | `packageSlug` | Read metadata for one package. |
| `get-docs` | `packageSlug`, `page?` | Read one documentation page as Markdown. |
| `get-source` | `packageSlug` | Read bundled public source for one package. |
| `list-examples` | `packageSlug` | List runnable REPL examples for one package. |
| `get-example` | `exampleId`, `packageSlug` | Read one runnable REPL example. |
| `search-packages` | `query` | Search package metadata, docs, examples, and source. |
| `get-type-signature` | `slug`, `symbol` | Read one exported TypeScript declaration. |
<!-- TOOLS:GENERIC:END -->

## Refine Tools

<!-- TOOLS:REFINE:START -->
| Tool | Input | Description |
| --- | --- | --- |
| `refine-list-components` | — | List bundled Refine web components. |
| `refine-get-component` | `tagName` | Read one Refine component declaration. |
| `refine-generate-template` | `scenario?`, `tagName` | Generate a minimal Refine component HTML template. |
| `refine-get-tokens` | `filter?` | List bundled Refine CSS custom properties. |
| `refine-validate-usage` | `html`, `tagName` | Validate unknown attributes in one Refine component HTML fragment. |
<!-- TOOLS:REFINE:END -->
