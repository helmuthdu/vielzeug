---
title: 'Codex Examples — Looking Up Components'
description: 'Looking up Refine components example for @vielzeug/codex.'
---

## Looking Up Components

### Problem

You need to discover which `@vielzeug/refine` web components are available and inspect their attributes, events, slots, and CSS properties to generate correct usage code.

### Solution

Call `list-components` to enumerate tags, then `get-component` with the desired tag to retrieve the full CEM declaration.

#### List available component tags

```json
{ "name": "list-components", "arguments": {} }
```

Result excerpt:

```json
[
  { "name": "Button", "tagName": "ore-button" },
  { "name": "Input", "tagName": "ore-input" },
  { "name": "Dialog", "tagName": "ore-dialog" }
]
```

#### Read one component declaration

```json
{ "name": "get-component", "arguments": { "tagName": "ore-button" } }
```

The result is the full CEM declaration including `attributes`, `members`, `events`, `slots`, `cssParts`, and `cssProperties`.

### Pitfalls

- Both tools return `isError: true` when Refine component metadata is not present in the snapshot. This happens in local monorepo builds when `@vielzeug/refine` has not been built yet. Run `rush build --to refine` then `pnpm run prepare:data` in `packages/codex`.
- `get-component` matches on `tagName` exactly. Passing a class name like `"Button"` instead of `"ore-button"` returns an error.
- Published releases always include Refine CEM; the missing-metadata error only occurs during local development.

### Related

- [Refine](/refine/) — the `@vielzeug/refine` package
- [API Reference — list-components](../api.md#list-components)
- [API Reference — get-component](../api.md#get-component)
