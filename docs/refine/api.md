---
title: Refine — API Reference
description: Published component registration and stylesheet entry points for @vielzeug/refine.
---

# API Reference

[[toc]]

Refine deliberately publishes components, not a second headless framework. Register each element through its component
subpath and import its types from the same path.

## Styles

```ts
import '@vielzeug/refine/tokens.css';
import '@vielzeug/refine/styles/preflight.css'; // Optional: normalizes browser defaults.
```

`tokens.css` defines Refine's design tokens, animations, and cascade-layer order without modifying global element
defaults. `preflight.css` is a separate opt-in reset.

Direct CSS entry points are also available when needed:

| Import path | Purpose |
| --- | --- |
| `@vielzeug/refine/tokens.css` | Tokens, animation helpers, and cascade layers |
| `@vielzeug/refine/styles/theme.css` | Theme token declarations |
| `@vielzeug/refine/styles/animation.css` | Animation helpers |
| `@vielzeug/refine/styles/layers.css` | Cascade layer declarations |
| `@vielzeug/refine/styles/preflight.css` | Optional browser-default reset |

## Components

Each component has a single registration and type entry point:

```ts
import '@vielzeug/refine/button';
import type { OreButtonEvents, OreButtonProps } from '@vielzeug/refine/button';
```

The package root only exports `RefineError`; it does not register elements. This keeps component ownership and bundle
contents explicit.

| Area | Components |
| --- | --- |
| Content | `accordion`, `accordion-item`, `avatar`, `avatar-group`, `badge`, `breadcrumb`, `card`, `carousel`, `chat-message`, `code-window`, `copy-command`, `icon`, `list`, `list-item`, `marquee`, `pagination`, `separator`, `step`, `stepper`, `table`, `text` |
| Feedback | `alert`, `async`, `chip`, `password-strength`, `progress`, `skeleton`, `toast`, `typing-indicator` |
| Inputs | `button`, `button-group`, `calendar`, `checkbox`, `checkbox-group`, `combobox`, `datagrid`, `date-picker`, `file-input`, `input`, `message-composer`, `number-input`, `otp-input`, `radio`, `radio-group`, `rating`, `select`, `slider`, `switch`, `textarea`, `time-picker` |
| Layout | `box`, `grid`, `grid-item`, `navbar`, `sidebar` |
| Overlays | `command-palette`, `dialog`, `drawer`, `menu`, `popover`, `tooltip` |

Each component's documentation page describes its attributes, properties, events, slots, parts, and custom properties.

## Events and Form Controls

Form controls expose their current `.value` or `.checked` property and dispatch standard `input` and `change` events.
Read the property from `event.currentTarget`; do not rely on framework-specific custom-event casts.

Stateful overlays expose `open` and `default-open` properties/attributes and dispatch `open-change` with
`{ open, reason }` detail. The per-component pages describe valid reasons and focus behavior.
