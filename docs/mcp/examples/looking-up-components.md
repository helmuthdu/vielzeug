---
title: 'Mcp Examples — Looking Up Components'
description: 'Looking up Block components example for @vielzeug/mcp.'
---

## Looking Up Components

### Problem

You need to discover which `@vielzeug/block` web components are available and inspect their attributes, events, slots, and CSS properties to generate correct usage code.

### Solution

Call `list-components` to enumerate tags, then `get-component` with the desired tag to retrieve the full CEM declaration.

#### List available component tags

```json
{ "name": "list-components", "arguments": {} }
```

Result excerpt:

```json
[
  { "name": "Button", "tagName": "bit-button" },
  { "name": "Input", "tagName": "bit-input" },
  { "name": "Dialog", "tagName": "bit-dialog" }
]
```

#### Read one component declaration

```json
{ "name": "get-component", "arguments": { "tagName": "bit-button" } }
```

The result is the full CEM declaration including `attributes`, `members`, `events`, `slots`, `cssParts`, and `cssProperties`.

### Pitfalls

- Both tools return `isError: true` when Block component metadata is not present in the snapshot. This happens in local monorepo builds when `@vielzeug/block` has not been built yet. Run `rush build --to block` then `pnpm run prepare:data` in `packages/mcp`.
- `get-component` matches on `tagName` exactly. Passing a class name like `"Button"` instead of `"bit-button"` returns an error.
- Published releases always include Block CEM; the missing-metadata error only occurs during local development.

### Related

- [Block](/block/) — the `@vielzeug/block` package
- [API Reference — list-components](../api.md#list-components)
- [API Reference — get-component](../api.md#get-component)
