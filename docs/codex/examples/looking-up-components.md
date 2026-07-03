---
title: 'Codex Examples — Looking Up Components'
description: 'Looking up Refine components example for @vielzeug/codex.'
---

## Looking Up Components

### Problem

You need to discover which `@vielzeug/refine` web components are available and inspect their attributes, events, slots, and CSS properties to generate correct usage code.

### Solution

Call `refine-list-components` to enumerate tags, then `refine-get-component` with the desired tag to retrieve the full CEM declaration. Use `refine-generate-template` and `refine-validate-usage` to close the generate → validate loop.

#### List available component tags

```json
{ "name": "refine-list-components", "arguments": {} }
```

Result excerpt:

```json
[
  { "tagName": "ore-button", "description": "A clickable button element.", "attrs": [{ "name": "variant", "type": "string", "default": "primary" }] },
  { "tagName": "ore-input", "description": "A text input field.", "attrs": [] },
  { "tagName": "ore-dialog", "description": "A modal dialog.", "attrs": [] }
]
```

#### Read one component declaration

```json
{ "name": "refine-get-component", "arguments": { "tagName": "ore-button" } }
```

The result is the full CEM declaration including `attributes`, `members`, `events`, `slots`, `cssParts`, and `cssProperties`.

#### Generate a starting template, then validate it

```json
{ "name": "refine-generate-template", "arguments": { "tagName": "ore-button", "scenario": "primary call-to-action" } }
```

```json
{ "name": "refine-validate-usage", "arguments": { "tagName": "ore-button", "html": "<ore-button variant=\"primary\">Submit</ore-button>" } }
```

`refine-validate-usage` returns `[]` when the HTML is valid, or a list of `{ type, message }` issues
for unknown attributes or slots — catching hallucinated attribute names before they reach the DOM.

### Pitfalls

- All four tools return `isError: true` when Refine component metadata is not present in the snapshot. This happens in local monorepo builds when `@vielzeug/refine` has not been built yet. Run `rush build --to refine` then `pnpm run prepare:data` in `packages/codex`.
- `refine-get-component` matches on `tagName` exactly. Passing a class name like `"Button"` instead of `"ore-button"` returns an error.
- Published releases always include Refine CEM; the missing-metadata error only occurs during local development.

### Related

- [Refine](/refine/) — the `@vielzeug/refine` package
- [API Reference — refine-list-components](../api.md#refine-list-components)
- [API Reference — refine-get-component](../api.md#refine-get-component)
- [API Reference — refine-generate-template](../api.md#refine-generate-template)
- [API Reference — refine-validate-usage](../api.md#refine-validate-usage)
