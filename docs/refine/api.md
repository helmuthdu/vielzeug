---
title: 'Refine: API Reference'
description: Published component, stylesheet, framework type, and error entry points for @vielzeug/refine.
---

[[toc]]

## API Overview

| Symbol                                      | Purpose                                                                              | Execution mode     | Common gotcha                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| `@vielzeug/refine/<component>`              | Register one custom element and export its public types                              | Sync               | Importing a type alone does not register the element                                   |
| `@vielzeug/refine/tokens.css`               | Load required theme tokens, animations, and cascade layers                           | CSS                | Import once before components render                                                   |
| `@vielzeug/refine/fouc.css`                 | Hide unregistered `ore-*` elements until upgrade                                     | CSS                | Load before first paint                                                                |
| `@vielzeug/refine/styles/preflight.css`     | Apply the optional browser reset                                                     | CSS                | The reset affects global elements                                                      |
| `@vielzeug/refine/frameworks/elements`      | Register typed DOM tag mappings                                                      | Types only         | Import for side effects in TypeScript                                                  |
| `@vielzeug/refine/frameworks/react`         | Register typed React JSX elements                                                    | Types only         | Does not provide runtime wrappers                                                      |
| `@vielzeug/refine/frameworks/vue`           | Register typed Vue global components                                                 | Types only         | Does not install a Vue plugin                                                          |
| `@vielzeug/refine/theme`                    | `createThemeController()`: light/dark/system document theme                          | Sync               | Does not persist the preference or set an accent color                                 |
| `@vielzeug/refine/blueprint`                | `parseUiBlueprint()`: validate a model-authored UI document against a fixed registry | Sync               | Pure contract only: it registers no components and renders nothing                     |
| `@vielzeug/refine/blueprint/render`         | `renderUiBlueprint()`: render a validated document with registered components        | Sync               | Registers its thirteen components on import; rejects before touching the container     |
| `eventFieldValue()` / `eventFieldChecked()` | Read a form control's value/checked from `event.currentTarget`                       | Sync               | Exported from the package root; guards non-field targets                               |
| `animateReflow()`                           | Token-driven FLIP reflow for keyed lists                                             | Async (next frame) | Exported from the package root; elements need stable keys or it correctly does nothing |
| `setMotionMode()` / `getMotionMode()`       | Read/write the `data-motion` attribute on `<html>`                                   | Sync               | Exported from the package root; an unknown mode throws `RangeError`                    |
| `RefineError`                               | Base class for package-defined public errors                                         | Sync               | Component configuration warnings do not throw this error                               |

## Package Entry Point

| Import                              | Purpose                                                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vielzeug/refine`                  | Export `registerIcons`, icon definition types, `RefineError`, `animateReflow`, the motion-mode functions, and the field readers without registering components |
| `@vielzeug/refine/<component>`      | Register one component and export its tag constant, props, events, and related types                                                                           |
| `@vielzeug/refine/theme`            | `createThemeController()` and its theme types                                                                                                                  |
| `@vielzeug/refine/blueprint`        | On-demand UI document contract: `parseUiBlueprint()`, the node types, bounds, `UI_BLUEPRINT_REGISTRY`, and `UI_BLUEPRINT_JSON_SCHEMA`                          |
| `@vielzeug/refine/blueprint/render` | `renderUiBlueprint()` and the thirteen component tags it registers                                                                                             |
| `@vielzeug/refine/tokens.css`       | Required global design contract                                                                                                                                |
| `@vielzeug/refine/fouc.css`         | Optional pre-upgrade visibility rule                                                                                                                           |
| `@vielzeug/refine/styles/*`         | Focused theme, animation, layer, and preflight stylesheets                                                                                                     |
| `@vielzeug/refine/frameworks/*`     | TypeScript augmentations for DOM, React, and Vue                                                                                                               |

## Icon Registration and Adapters

`registerIcons(icons: Readonly<Record<string, IconDefinition>>): void` is available from `@vielzeug/refine/icons`, `@vielzeug/refine`, and `@vielzeug/refine/icon`. The common `icons` entry and root remain free of component registration side effects.

`IconDefinition`, `IconElement`, and `IconAttributes` are exported from all three entries. Shared definition and registration modules live in `src/icons/`, alongside adapters and internal SVG helpers/defaults. Definitions contain a numeric `viewBox` tuple, optional presentation attributes, and recursive SVG children; they do not require a provider identity. Invalid registrations throw the root-exported `RefineError` atomically.

| Entry                               | Export                                                                 | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `@vielzeug/refine/icons`            | `registerIcons`, `IconDefinition`, `IconElement`, `IconAttributes`     | Common library-neutral registration and definition API           |
| `@vielzeug/refine/icons/lucide`     | `lucideIcons`, `LucideIconData`                                        | Pure adapter for selected structural Lucide SVG data             |
| `@vielzeug/refine/icons/lucide/all` | Side-effect registration                                               | Explicitly register the full installed Lucide library            |
| `@vielzeug/refine/icons/heroicons`  | `heroiconsIcons`, `IconifyIcon`                                        | Convert a caller-named map of individual Heroicons Iconify data  |
| `@vielzeug/refine/icons/tabler`     | `tablerIcons`, `IconifyIcon`                                           | Convert a caller-named map of individual Tabler Iconify data     |
| `@vielzeug/refine/icons/mdi`        | `mdiIcons`, `IconifyIcon`                                              | Convert a caller-named map of individual MDI Iconify data        |
| `@vielzeug/refine/icons/iconify`    | `iconifyIcon`, `iconifyIcons`                                          | Convert individual Iconify data or selected/complete collections |
| `@vielzeug/refine/icons/iconify`    | `IconifyIcon`, `IconifyAlias`, `IconifyCollection`, `IconifyTransform` | Structural data types; no Iconify dependency required            |

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

| Import path                             | Purpose                                         |
| --------------------------------------- | ----------------------------------------------- |
| `@vielzeug/refine/fouc.css`             | FOUC suppression for unupgraded custom elements |
| `@vielzeug/refine/tokens.css`           | Tokens, animation helpers, and cascade layers   |
| `@vielzeug/refine/styles/theme.css`     | Theme token declarations                        |
| `@vielzeug/refine/styles/animation.css` | Animation helpers                               |
| `@vielzeug/refine/styles/layers.css`    | Cascade layer declarations                      |
| `@vielzeug/refine/styles/preflight.css` | Optional browser reset and FOUC suppression     |

## Components

Each component uses one registration and type entry point:

```ts
import '@vielzeug/refine/button';
import type { OreButtonProps } from '@vielzeug/refine/button';
```

| Area       | Components                                                                                                                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content    | `accordion`, `avatar`, `card`, `card-picker`, `carousel`, `chat-message`, `chat-panel`, `code-window`, `copy-command`, `icon`, `keyboard-key`, `list`, `marquee`, `qr-code`, `rank-list`, `speech-player`, `speed-reading`, `stats`, `table`, `text`                              |
| Feedback   | `alert`, `badge`, `chip`, `cookie-banner`, `password-strength`, `progress`, `pull-to-refresh`, `skeleton`, `state`, `toast`, `typing-indicator`                                                                                                                                   |
| Inputs     | `button`, `calendar`, `checkbox`, `color-picker`, `combobox`, `counter`, `datagrid`, `date-picker`, `file-input`, `input`, `message-composer`, `number-input`, `otp-input`, `qr-scanner`, `query-bar`, `radio`, `rating`, `select`, `slider`, `switch`, `textarea`, `time-picker` |
| Layout     | `box`, `dock`, `grid`, `navbar`, `separator`, `sidebar`                                                                                                                                                                                                                           |
| Navigation | `breadcrumb`, `media-navigation`, `navigation-menu`, `pagination`, `stepper`, `tabs`                                                                                                                                                                                              |
| Overlay    | `command-palette`, `dialog`, `drawer`, `menu`, `popover`, `spotlight`, `tooltip`, `tour`                                                                                                                                                                                          |

Each row lists the entry points that own a documentation page. Sub-element entries (`accordion-item`, `tab-item`, `avatar-group`, `list-item`, `step`, and the rest) are documented on their parent's page and share its category.

Each component page lists its attributes, JavaScript properties, events, slots, parts, and CSS custom properties.

The [`query-bar`](./components/query-bar.md) entry also exports `QueryState`, `QueryTokenDef`, `QueryQuickFilter`, `QueryBarLabels`, and pure grammar helpers. Vocabulary entries default to single selection; `selection: 'multiple'` allows distinct values for the same key. `anyLabel` customizes the unrestricted single-selection choice, such as “Default order” for sorting. Options accept an optional `icon` (registered `ore-icon` name), displayed beside their labels in the drawer. `tokenValues(state, key)` reads all values, `removeToken(state, token)` removes an exact pair, and `clearTokens(state, key)` clears a group. Its unified field contains applied filters, with a compact secondary row for filter entry, quick toggles, and a `toolbar-end` slot for application content such as a result count. Drawer selection uses the same state and vocabulary as typed suggestions. Pending edits block incidental backdrop/swipe dismissal; explicit Cancel, Close, and Escape discard them. Search-hidden selections remain visible in a summary.

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

---

### `animateReflow(host, signal, options)`

```ts
import { animateReflow } from '@vielzeug/refine';

const reflow = animateReflow(list, abortController.signal, {
  elements: () => [...list.querySelectorAll('li')],
  getKey: (item) => item.dataset.id,
});
reflow.run(() => renderItems(nextItems));
```

Token-driven FLIP reflow for keyed lists: captures the current layout, runs `mutate`, then animates the tracked elements into their new positions on the next frame. The same helper the DataGrid, command palette, and toast stack use.

| Parameter               | Type                          | Description                                               |
| ----------------------- | ----------------------------- | --------------------------------------------------------- |
| `host`                  | `HTMLElement`                 | Element whose computed style carries the timing tokens    |
| `signal`                | `AbortSignal`                 | Aborting cancels in-flight animations                     |
| `options.elements`      | `() => HTMLElement[]`         | Tracked elements, read live on both sides of the mutation |
| `options.getKey`        | `(el) => string \| undefined` | Stable identity per element; all-or-nothing               |
| `options.durationToken` | `string?`                     | Duration token, default `'--duration-200'`                |
| `options.easingToken`   | `string?`                     | Easing token, default `'--ease-move'`                     |
| `options.stagger`       | `number?`                     | Per-element delay in ms, default `0`                      |

**Returns** a `Reflow` handle with one method: `run(mutate)` (sync; the animation is fire-and-forget). Timing is read from the tokens at animation time, so Motion Mode reduction skips the reflow instead of playing it instantly. Every path that cannot animate (no elements, missing keys, zeroed tokens, aborted signal, no Web Animations API) still runs `mutate` exactly once and never throws. See [Animation & Motion → List Reflow](./animation#list-reflow-animatereflow) for behavior details.

---

### `setMotionMode(mode)` / `getMotionMode()`

```ts
import { getMotionMode, setMotionMode } from '@vielzeug/refine';

setMotionMode('reduced'); // returns the applied mode
```

Read/write the `data-motion` attribute on `<html>` (`'full' | 'reduced' | 'system'`; `'system'` removes the attribute). An unknown mode throws `RangeError`. The attribute drives the token layer: see [Animation & Motion → Motion Mode](./animation#motion-mode).

## On-Demand UI Documents

`@vielzeug/refine/blueprint` is the trusted boundary for UI that a model writes. A harness asks a model to describe a small UI in JSON, and this contract decides whether that JSON may be rendered. It is data only: no code, no HTML, no callbacks, no styles, no URLs. See [On-Demand UI Documents](./on-demand-ui) for the full guide.

```ts
import { parseUiBlueprint, safeParseUiBlueprint } from '@vielzeug/refine/blueprint';

const result = safeParseUiBlueprint(JSON.parse(modelOutput)); // model output stays `unknown`
if (!result.success)
  showError(result.issues); // safe to display: field paths, no secrets
else renderValidated(result.document);
```

| Export                                                                                                                                                                               | Purpose                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UI_BLUEPRINT_VERSION`                                                                                                                                                               | The only document version accepted (`1`)                                                                                                                                  |
| `parseUiBlueprint(value)`                                                                                                                                                            | Validate `unknown`. Returns the document unchanged, or throws `UiBlueprintError`. Nothing is repaired or partially accepted                                               |
| `safeParseUiBlueprint(value)`                                                                                                                                                        | Non-throwing form: `{ success: true, document }` or `{ success: false, issues }`                                                                                          |
| `UiBlueprintError`                                                                                                                                                                   | `RefineError` subclass carrying `issues: readonly string[]`, each a field path such as `root.children[0].size`                                                            |
| `UI_BLUEPRINT_COMPONENTS`                                                                                                                                                            | The thirteen accepted component names: `text`, `box`, `card`, `button`, `badge`, `separator`, `slider`, `switch`, `checkbox`, `number-input`, `alert`, `progress`, `icon` |
| `UI_BLUEPRINT_REGISTRY`                                                                                                                                                              | The same registry as data: element tag, child policy, attribute names, slot-text fields, and accepted values per component                                                |
| `UI_BLUEPRINT_JSON_SCHEMA`                                                                                                                                                           | JSON Schema (draft 2020-12) for the contract, for harnesses with structured output                                                                                        |
| `BlueprintDocument`, `BlueprintNode`, and the node interfaces                                                                                                                        | TypeScript types for the document shape. Every node accepts an optional bounded `id` through `BlueprintNodeMeta`                                                          |
| `MAX_BLUEPRINT_NODES`, `MAX_BLUEPRINT_DEPTH`, `MAX_BLUEPRINT_CHILDREN`, `MAX_BLUEPRINT_TEXT_LENGTH`, `MAX_BLUEPRINT_LABEL_LENGTH`, `MAX_BLUEPRINT_NUMBER`, `MAX_BLUEPRINT_ID_LENGTH` | Document bounds, not user-configurable                                                                                                                                    |

`@vielzeug/refine/blueprint` imports nothing but `RefineError`: it is pure, DOM-free, and safe to run in a model harness, a worker, or CI. It registers no components.

`UI_BLUEPRINT_JSON_SCHEMA` constrains generation but cannot express the tree-wide node and depth bounds, so runtime validation stays mandatory. Treat the schema as a generation aid, never as the trust boundary.

### `renderUiBlueprint(container, value, options?)`

```ts
import { renderUiBlueprint } from '@vielzeug/refine/blueprint/render';

try {
  const { element, nodes } = renderUiBlueprint(host, JSON.parse(modelOutput), { label: 'Generated summary' });
  nodes.get('rate')?.addEventListener('change', () => recalculate());
} catch (error) {
  // The container is untouched: the previous preview is still on screen.
}
```

Validate `value`, then render it into `container` using only registry components. Importing the entry registers those thirteen components, so no separate component imports are needed.

| Parameter         | Type          | Description                                                                        |
| ----------------- | ------------- | ---------------------------------------------------------------------------------- |
| `container`       | `HTMLElement` | Element that receives the rendered tree                                            |
| `value`           | `unknown`     | Untrusted model output. Validated before anything is rendered                      |
| `options.label`   | `string?`     | Accessible name for a `role="group"` wrapper. Host-owned: a document cannot set it |
| `options.replace` | `boolean?`    | Clear the container first. Default `true`; `false` appends                         |

**Returns** a `UiBlueprintRenderResult`: `{ element, nodes }`, the rendered root and a `ReadonlyMap<string, HTMLElement>` keyed by each node's optional `id` so the host can wire behaviour to addressable controls. `id` is host-facing metadata: the renderer never writes it to the DOM. Validation runs first, so a rejected document throws `UiBlueprintError` before the container is read or written: an invalid response can never partially render or erase a valid preview. Text becomes a text node, never markup.

### `createUiBlueprintElement(node, owner?, nodes?)`

```ts
import { createUiBlueprintElement } from '@vielzeug/refine/blueprint/render';

const element = createUiBlueprintElement(document.root, 'root', nodeMap);
```

Build one element for an already-validated node. Pass a `Map` as `nodes` to collect every id-tagged element it creates, including nested ones; `owner` labels the node's position in rejection messages. This is the component registry: adding a component means adding a rule in the contract and a case here, and nothing else. It throws `TypeError` for an unregistered node type, so a hand-built node cannot bypass validation either. Embedders that place nodes themselves use this; `renderUiBlueprint()` is the normal entry point.

## Types

Component props follow the `Ore<Component>Props` naming pattern. Event maps follow `Ore<Component>Events`. Import both from the component subpath that owns them.

`RefineElementMap`, `RefineReactIntrinsicElements`, and `RefineVueGlobalComponents` are exported from their respective `frameworks/*` type entry points.

The package root also exports `Reflow` (the `run()` handle), `ReflowOptions` (its options object), and `MotionMode` (`'full' | 'reduced' | 'system'`).

## Errors

### `RefineError`

```ts
class RefineError extends Error {
  constructor(message: string, opts?: ErrorOptions);
}
```

Base class for public Refine errors. It preserves `cause` through `ErrorOptions`.

### `UiBlueprintError`

```ts
class UiBlueprintError extends RefineError {
  readonly issues: readonly string[];
}
```

Thrown by `parseUiBlueprint()` and `renderUiBlueprint()` for a rejected on-demand UI document. Every rejection is collected first, so `issues` lists all of them at once, each as a field path plus a plain reason (`root.children[0].size: expected one of sm, md, lg, received string.`). The messages name fields and allowed values, report a wrong-typed value only as its _type_, and echo an accepted-type value only as a truncated snippet, so they are safe to display to a user. See [On-Demand UI Documents](./on-demand-ui).
