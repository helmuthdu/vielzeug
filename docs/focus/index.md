---
title: Focus — Navigation and restoration
description: Framework-neutral list navigation and focus restoration primitives.
package: focus
category: input
keywords: [focus, roving, keyboard, accessibility, list navigation]
exports: [createListNavigation, captureFocus, restoreFocus]
related: [refine, keymap, ore]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="focus" />

## Why Focus?

Composite widgets need consistent keyboard navigation and predictable return focus behavior. Focus centralizes those primitives without coupling to component rendering or framework state.

```ts
// Before
list.addEventListener('keydown', (event) => {
  // arrow/home/end bookkeeping, disabled filtering, wrapping
});

// After
const nav = createListNavigation({ getItems, onNavigate: (_action, index) => rows[index]?.focus() });
list.addEventListener('keydown', nav.handleKeydown);
```

| Feature | Per-component navigation | Focus |
| --- | --- | --- |
| Bundle size | n/a | <PackageInfo package="focus" type="size" /> |
| Zero dependencies | n/a | <ore-icon name="check" size="16"></ore-icon> |
| RTL mirroring | Manual | Built in |
| Typeahead | Manual | Optional via `getItemLabel` |
| Focus restoration | Manual capture | `captureFocus()` / `restoreFocus()` |

<div class="decision-callout">

**Use Focus when** a widget needs arrow-key navigation, Home/End, and controlled focus restoration.

**Consider direct focus calls when** interaction is a single isolated element with no composite navigation.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/focus
```

```sh [npm]
npm install @vielzeug/focus
```

```sh [yarn]
yarn add @vielzeug/focus
```

:::

## Quick Start

```ts
import { captureFocus, createListNavigation } from '@vielzeug/focus';

const restore = captureFocus();
const nav = createListNavigation({
  getItems: () => items,
  loop: true,
  onNavigate: (_action, index) => items[index]?.focus(),
});

container.addEventListener('keydown', nav.handleKeydown);

restore.restore();
nav.dispose();
```

## Features

<div class="features-grid">

- `createListNavigation()` — reusable composite-widget keyboard navigation
- Orientation and direction support — vertical/horizontal/both with LTR/RTL defaults
- Dynamic item queries — disabled filtering and loop control
- Optional typeahead — label-based navigation in key-driven lists
- `captureFocus()` and `restoreFocus()` — explicit return-focus helpers

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Refine](/refine/) — component primitives integrating list navigation.
- [Keymap](/keymap/) — global and scoped keyboard shortcuts.
- [Ore](/ore/) — lifecycle ownership used by consumer components.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
