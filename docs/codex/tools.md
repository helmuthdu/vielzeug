---
title: 'Codex: MCP Tools'
description: Generic and Refine tool tables generated from the compiled tool registries.
---

[[toc]]

## Generic Tools

<!-- TOOLS:GENERIC:START -->
| Tool                 | Input                      | Description                                                                 |
| -------------------- | -------------------------- | --------------------------------------------------------------------------- |
| `list-packages`      | N/A                        | List every Vielzeug package.                                                |
| `get-package`        | `slug`                     | Read metadata for one package: docs pages, example ids, and export names.   |
| `get-docs`           | `page`, `section?`, `slug` | Read one documentation page as Markdown, optionally just one section of it. |
| `get-example`        | `exampleId`, `slug`        | Read one runnable REPL example.                                             |
| `get-type-signature` | `slug`, `symbol`           | Read one exported TypeScript declaration with its JSDoc.                    |
| `search`             | `query`                    | Search all docs by section.                                                 |
<!-- TOOLS:GENERIC:END -->

## Refine Tools

<!-- TOOLS:REFINE:START -->
| Tool                     | Input     | Description                                                                                                                                         |
| ------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refine-list-components` | N/A       | List bundled Refine component tags and descriptions.                                                                                                |
| `refine-get-component`   | `tagName` | Read one Refine component declaration.                                                                                                              |
| `refine-get-tokens`      | `filter?` | List Refine theme tokens (custom properties from theme.css) with values and notes.                                                                  |
| `refine-validate-usage`  | `html`    | Validate a Refine HTML fragment: unknown ore-* tags, unknown attributes, and values outside each attribute's allowed set, across every opening tag. |
<!-- TOOLS:REFINE:END -->
