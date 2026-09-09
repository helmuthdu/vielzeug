---
title: Refine — API Reference
description: Published component, stylesheet, framework type, and error entry points for @vielzeug/refine.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `@vielzeug/refine/<component>` | Register one custom element and export its public types | Sync | Importing a type alone does not register the element |
| `@vielzeug/refine/tokens.css` | Load required theme tokens, animations, and cascade layers | CSS | Import once before components render |
| `@vielzeug/refine/fouc.css` | Hide unregistered `ore-*` elements until upgrade | CSS | Load before first paint |
| `@vielzeug/refine/styles/preflight.css` | Apply the optional browser reset | CSS | The reset affects global elements |
| `@vielzeug/refine/frameworks/elements` | Register typed DOM tag mappings | Types only | Import for side effects in TypeScript |
| `@vielzeug/refine/frameworks/react` | Register typed React JSX elements | Types only | Does not provide runtime wrappers |
| `@vielzeug/refine/frameworks/vue` | Register typed Vue global components | Types only | Does not install a Vue plugin |
| `RefineError` | Base class for package-defined public errors | Sync | Component configuration warnings do not throw this error |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/refine` | Export `RefineError` without registering components |
| `@vielzeug/refine/<component>` | Register one component and export its tag constant, props, events, and related types |
| `@vielzeug/refine/tokens.css` | Required global design contract |
| `@vielzeug/refine/fouc.css` | Optional pre-upgrade visibility rule |
| `@vielzeug/refine/styles/*` | Focused theme, animation, layer, and preflight stylesheets |
| `@vielzeug/refine/frameworks/*` | TypeScript augmentations for DOM, React, and Vue |

## Styles

```ts
import '@vielzeug/refine/fouc.css';
import '@vielzeug/refine/tokens.css';
import '@vielzeug/refine/styles/preflight.css';
```

`tokens.css` is required. It defines tokens, animations, and cascade-layer order without resetting global elements. `preflight.css` is optional and includes FOUC suppression.

| Import path | Purpose |
| --- | --- |
| `@vielzeug/refine/fouc.css` | FOUC suppression for unupgraded custom elements |
| `@vielzeug/refine/tokens.css` | Tokens, animation helpers, and cascade layers |
| `@vielzeug/refine/styles/theme.css` | Theme token declarations |
| `@vielzeug/refine/styles/animation.css` | Animation helpers |
| `@vielzeug/refine/styles/layers.css` | Cascade layer declarations |
| `@vielzeug/refine/styles/preflight.css` | Optional browser reset and FOUC suppression |

## Components

Each component uses one registration and type entry point:

```ts
import '@vielzeug/refine/button';
import type { OreButtonProps } from '@vielzeug/refine/button';
```

| Area | Components |
| --- | --- |
| Content | `avatar`, `avatar-group`, `breadcrumb`, `card`, `carousel`, `chat-message`, `code-window`, `copy-command`, `icon`, `list`, `list-item`, `marquee`, `pagination`, `separator`, `stats`, `step`, `stepper`, `table`, `text` |
| Disclosure | `accordion`, `accordion-item`, `tabs`, `tab-item`, `tab-panel` |
| Feedback | `alert`, `async`, `badge`, `chip`, `password-strength`, `progress`, `skeleton`, `toast`, `typing-indicator` |
| Inputs | `button`, `button-group`, `calendar`, `checkbox`, `checkbox-group`, `combobox`, `datagrid`, `date-picker`, `file-input`, `input`, `message-composer`, `number-input`, `otp-input`, `radio`, `radio-group`, `rating`, `select`, `slider`, `switch`, `textarea`, `time-picker` |
| Layout | `box`, `grid`, `grid-item`, `navbar`, `sidebar` |
| Overlays | `command-palette`, `dialog`, `drawer`, `menu`, `navigation-menu`, `popover`, `tooltip` |

Each component page lists its attributes, JavaScript properties, events, slots, parts, and CSS custom properties.

## Framework Types

```ts
import type {} from '@vielzeug/refine/frameworks/elements';
import type {} from '@vielzeug/refine/frameworks/react';
import type {} from '@vielzeug/refine/frameworks/vue';
```

The declarations cover every supported tag and derive component properties from Refine's authoritative `HTMLElementTagNameMap`. They provide types only; component registration still uses component subpaths.

## Events and Form Controls

Form controls expose `.value` or `.checked` and dispatch standard `input` and `change` events. Read the property from `event.currentTarget`.

Stateful overlays expose controlled `open`, optional `default-open`, and an `open-change` custom event with `{ open, reason }` detail. Component pages define additional detail fields and reasons.

## Types

Component props follow the `Ore<Component>Props` naming pattern. Event maps follow `Ore<Component>Events`. Import both from the component subpath that owns them.

`RefineElementMap`, `RefineReactIntrinsicElements`, and `RefineVueGlobalComponents` are exported from their respective `frameworks/*` type entry points.

## Errors

### `RefineError`

```ts
class RefineError extends Error {
  constructor(message: string, opts?: ErrorOptions);
}
```

Base class for public Refine errors. It preserves `cause` through `ErrorOptions`.
