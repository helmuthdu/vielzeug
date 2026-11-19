---
title: 'Codex Examples: Refine Components'
description: 'Refine component, token, and usage-validation example for @vielzeug/codex.'
---

## Refine Components

### Problem

You need to know which `@vielzeug/refine` web components exist, what attributes, events, slots, and CSS properties they expose, and whether generated markup is valid.

### Solution

Call `refine-list-components` to enumerate tags and summaries, then `refine-get-component` with the desired `tagName` for the full declaration. Use `refine-get-tokens` for theme custom properties and `refine-validate-usage` to check generated markup.

```json
{ "name": "refine-list-components", "arguments": {} }
```

Result excerpt:

```json
[{ "summary": "A clickable button element.", "tag": "ore-button" }]
```

```json
{ "name": "refine-get-component", "arguments": { "tagName": "ore-button" } }
```

The result carries `attributes` (with CEM types and defaults), `events`, `slots`, `cssParts`, `cssProperties`, and the `docPage` carrying the component's examples: read it with `get-docs` (`slug: "refine"`).

```json
{ "name": "refine-get-tokens", "arguments": { "filter": "--ore-spacing" } }
```

#### Validate generated markup

`refine-validate-usage` checks **every** `<ore-*>` opening tag in the fragment: unknown tags, unknown attributes, and values outside each attribute's allowed set:

```json
{ "name": "refine-validate-usage", "arguments": { "html": "<ore-button variant=\"primary\">Submit</ore-button>" } }
```

It returns no issues for valid markup, or a list of `{ type, message, tag }` errors: catching hallucinated attribute names before they reach the DOM.

### Pitfalls

- The `refine-*` tools are only offered when the snapshot carries Refine components. `prepare:data` refuses to generate a snapshot without `@vielzeug/refine`'s `custom-elements.json`, so a missing set only happens with a hand-assembled snapshot.
- `refine-get-component` matches on `tagName` exactly: `"Button"` instead of `"ore-button"` returns an error.
- Validation checks attributes and enum values, not children or slot content.

### Related

- [Refine](/refine/): the `@vielzeug/refine` package
- [Tool reference](../tools.md)
