---
title: 'Codex Examples: Looking Up Components'
description: 'Looking up Refine components example for @vielzeug/codex.'
---

## Looking Up Components

### Problem

You need to discover which `@vielzeug/refine` web components are available and inspect their attributes, events, slots, and CSS properties to generate correct usage code.

### Solution

Call `refine-list-components` to enumerate tags and descriptions, then `refine-get-component` with the desired tag to retrieve the full CEM declaration (attributes live only in that declaration, keeping the listing small). Use `refine-generate-template` and `refine-validate-usage` to close the generate → validate loop.

#### List available component tags

```json
{ "name": "refine-list-components", "arguments": {} }
```

Result excerpt:

```json
[
  { "tagName": "ore-button", "description": "A clickable button element." },
  { "tagName": "ore-input", "description": "A text input field." },
  { "tagName": "ore-dialog", "description": "A modal dialog." }
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
{
  "name": "refine-validate-usage",
  "arguments": { "tagName": "ore-button", "html": "<ore-button variant=\"primary\">Submit</ore-button>" }
}
```

`refine-validate-usage` returns `[]` when the HTML is valid, or a list of `{ type, message }` issues
for unknown attributes or slots: catching hallucinated attribute names before they reach the DOM.

### Pitfalls

- The `refine-*` tools are only offered when the snapshot carries Refine component metadata. `prepare:data` refuses to generate a snapshot without `@vielzeug/refine`'s `custom-elements.json`, so a missing set only happens with a hand-assembled snapshot.
- `refine-get-component` matches on `tagName` exactly. Passing a class name like `"Button"` instead of `"ore-button"` returns an error.

### Related

- [Refine](/refine/): the `@vielzeug/refine` package
- [Tool reference](../tools.md)
