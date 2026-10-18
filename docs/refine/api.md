---
title: 'Refine: API Reference'
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
| `@vielzeug/refine/theme` | `createThemeController()`: light/dark/system document theme | Sync | Does not persist the preference or set an accent color |
| `eventFieldValue()` / `eventFieldChecked()` | Read a form control's value/checked from `event.currentTarget` | Sync | Exported from the package root; guards non-field targets |
| `RefineError` | Base class for package-defined public errors | Sync | Component configuration warnings do not throw this error |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/refine` | Export `registerIcons`, icon definition types, `RefineError`, and the field readers without registering components |
| `@vielzeug/refine/<component>` | Register one component and export its tag constant, props, events, and related types |
| `@vielzeug/refine/theme` | `createThemeController()` and its theme types |
| `@vielzeug/refine/tokens.css` | Required global design contract |
| `@vielzeug/refine/fouc.css` | Optional pre-upgrade visibility rule |
| `@vielzeug/refine/styles/*` | Focused theme, animation, layer, and preflight stylesheets |
| `@vielzeug/refine/frameworks/*` | TypeScript augmentations for DOM, React, and Vue |

## Icon Registration and Adapters

`registerIcons(icons: Readonly<Record<string, IconDefinition>>): void` is available from `@vielzeug/refine/icons`, `@vielzeug/refine`, and `@vielzeug/refine/icon`. The common `icons` entry and root remain free of component registration side effects.

`IconDefinition`, `IconElement`, and `IconAttributes` are exported from all three entries. Shared definition and registration modules live in `src/icons/`, alongside adapters and internal SVG helpers/defaults. Definitions contain a numeric `viewBox` tuple, optional presentation attributes, and recursive SVG children; they do not require a provider identity. Invalid registrations throw the root-exported `RefineError` atomically.

| Entry | Export | Purpose |
| --- | --- | --- |
| `@vielzeug/refine/icons` | `registerIcons`, `IconDefinition`, `IconElement`, `IconAttributes` | Common library-neutral registration and definition API |
| `@vielzeug/refine/icons/lucide` | `lucideIcons`, `LucideIconData` | Pure adapter for selected structural Lucide SVG data |
| `@vielzeug/refine/icons/lucide/all` | Side-effect registration | Explicitly register the full installed Lucide library |
| `@vielzeug/refine/icons/heroicons` | `heroiconsIcons`, `IconifyIcon` | Convert a caller-named map of individual Heroicons Iconify data |
| `@vielzeug/refine/icons/tabler` | `tablerIcons`, `IconifyIcon` | Convert a caller-named map of individual Tabler Iconify data |
| `@vielzeug/refine/icons/mdi` | `mdiIcons`, `IconifyIcon` | Convert a caller-named map of individual MDI Iconify data |
| `@vielzeug/refine/icons/iconify` | `iconifyIcon`, `iconifyIcons` | Convert individual Iconify data or selected/complete collections |
| `@vielzeug/refine/icons/iconify` | `IconifyIcon`, `IconifyAlias`, `IconifyCollection`, `IconifyTransform` | Structural data types; no Iconify dependency required |

Lucide is an optional peer, not a mandatory dependency. Only `icons/lucide/all` requires an installed `lucide` package; consumers selecting that entry declare it themselves. The structural `icons/lucide` adapter accepts supplied data without importing Lucide.

The standalone IIFE exposes `registerIcons`, `lucideIcons`, `heroiconsIcons`, `tablerIcons`, `mdiIcons`, `iconifyIcon`, and `iconifyIcons` under `Refine.components.content`. Neither the IIFE nor component entries import Lucide. Iconify conversion drops provider `class` metadata, validates finite numeric offsets and positive finite dimensions before transforms, and retains the strict SVG allowlist. See the [icon reference](./components/icon.md) for presentation overrides, local SVG ID rewriting, supported families, and licenses.

The three family adapters share this signature:

```ts
heroiconsIcons(icons: Readonly<Record<string, IconifyIcon>>): Record<string, IconDefinition>;
tablerIcons(icons: Readonly<Record<string, IconifyIcon>>): Record<string, IconDefinition>;
mdiIcons(icons: Readonly<Record<string, IconifyIcon>>): Record<string, IconDefinition>;
```

Each accepts individual Iconify SVG data, preserves input keys without adding a namespace, and returns definitions without registering them. They require `DOMParser`, preserve each icon's geometry/presentation/transforms, and throw `RefineError` for invalid Iconify data. They do not accept React/Vue components, collection JSON, or raw SVG path strings. Use `iconifyIcons(collection, names?)` for collections and alias resolution.

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
| Content | `avatar`, `avatar-group`, `breadcrumb`, `card`, `carousel`, `chat-message`, `code-window`, `copy-command`, `icon`, `keyboard-key`, `list`, `list-item`, `marquee`, `pagination`, `separator`, `speech-player`, `speed-reading`, `stats`, `step`, `stepper`, `table`, `text` |
| Disclosure | `accordion`, `accordion-item`, `tabs`, `tab-item`, `tab-panel` |
| Feedback | `alert`, `async`, `badge`, `chip`, `cookie-banner`, `password-strength`, `progress`, `skeleton`, `toast`, `typing-indicator` |
| Inputs | `button`, `button-group`, `calendar`, `checkbox`, `checkbox-group`, `combobox`, `counter`, `datagrid`, `date-picker`, `file-input`, `input`, `message-composer`, `number-input`, `otp-input`, `query-bar`, `radio`, `radio-group`, `rating`, `select`, `slider`, `switch`, `textarea`, `time-picker` |
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

Finite-choice properties use Ore's `prop.oneOf()` parsing: values outside a component's documented options resolve to
the declared default, or `undefined` when no default is declared.

Form-associated controls participate in native form submission, validity checks, and reset. A named control's value
is available through `new FormData(form)`, and supported `required` constraints affect `form.checkValidity()`,
`form.reportValidity()`, and submit blocking. The `error` property renders and announces feedback; it does not by
itself set native constraint validity.

Stateful overlays expose controlled `open`, optional `default-open`, and an `open-change` custom event with `{ open, reason }` detail. Component pages define additional detail fields and reasons.

## Utilities

### `createThemeController(options?)`

```ts
import { createThemeController } from '@vielzeug/refine/theme';

const theme = createThemeController(); // starts in 'system' mode
theme.setPreference('dark');
theme.dispose();
```

Owns the light/dark/system theme for the document: a reactive `preference` signal, the effective `resolved` mode (`'dark' | 'light'` after resolving `system` against the OS), and the DOM application `styles/theme.css` expects: the `.dark` class plus the `color-scheme` property on the root element, so every `light-dark()` token resolves to the right branch. While in `system` mode the controller tracks the OS `prefers-color-scheme` via sentinel's `createMediaQuery`.

The controller does **not** persist the preference or expose an accent color: those are consumer concerns (wire `watch(controller.preference, save)` for persistence; set `--color-primary-hue` yourself). Options: `initial` (starting preference, default `'system'`), `root` (element carrying the classes, default `document.documentElement`), `target` (window whose `matchMedia` backs `system`). The handle is disposable: `dispose()`, `disposed`, `disposalSignal`, `[Symbol.dispose]`.

### `eventFieldValue(event)` / `eventFieldChecked(event)`

```ts
import { eventFieldChecked, eventFieldValue } from '@vielzeug/refine';

input.addEventListener('input', (event) => {
  const value = eventFieldValue(event); // string | undefined: never a blind cast
});
```

Guarded readers for the standard `input`/`change` event pattern above: they read `value`/`checked` from `event.currentTarget` only when the target actually carries it, so a handler wired to the wrong element yields `undefined`/`false` instead of a crash or a lie. Exported from the package root, which registers no components.

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
