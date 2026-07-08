---
title: Refine — Web component library
description: Accessible, themeable web components built with Ore for framework and vanilla DOM apps.
package: refine
category: ui-components
keywords: [web-components, accessible, themeable, ui, components, design-system]
related: [ore, orbit, forge, keymap]
exports:
  [
    ore-accordion,
    ore-accordion-item,
    ore-alert,
    ore-async,
    ore-avatar,
    ore-avatar-group,
    ore-badge,
    ore-box,
    ore-breadcrumb,
    ore-breadcrumb-item,
    ore-button,
    ore-button-group,
    ore-calendar,
    ore-card,
    ore-carousel,
    ore-checkbox,
    ore-checkbox-group,
    ore-chip,
    ore-combobox,
    ore-command-palette,
    ore-command-palette-item,
    ore-datagrid,
    ore-date-picker,
    ore-dialog,
    ore-drawer,
    ore-file-input,
    ore-form,
    ore-grid,
    ore-grid-item,
    ore-icon,
    ore-input,
    ore-menu,
    ore-menu-item,
    ore-menu-separator,
    ore-navbar,
    ore-navbar-item,
    ore-number-input,
    ore-otp-input,
    ore-pagination,
    ore-password-strength,
    ore-popover,
    ore-progress,
    ore-radio,
    ore-radio-group,
    ore-rating,
    ore-select,
    ore-separator,
    ore-sidebar,
    ore-sidebar-group,
    ore-sidebar-item,
    ore-skeleton,
    ore-slider,
    ore-switch,
    ore-tab-item,
    ore-tab-panel,
    ore-table,
    ore-tabs,
    ore-text,
    ore-textarea,
    ore-time-picker,
    ore-toast,
    ore-tooltip,
  ]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="refine" />

## Why Refine?

Every project needs UI primitives. Refine provides accessible web components that work natively anywhere HTML is rendered—no framework required.

```html
<!-- Before — roll your own button with ARIA -->
<button class="btn btn-primary" role="button" aria-pressed="false" tabindex="0">
  <span class="btn-spinner" aria-hidden="true"></span>
  Save
</button>

<!-- After — Refine -->
<ore-button variant="primary" loading>Save</ore-button>
```

| Feature            | Refine                                       | Shoelace                                   | Material Web                               |
| ------------------ | ------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Bundle size        | <PackageInfo package="refine" type="size" /> | ~145 kB                                    | ~200 kB                                    |
| Built with         | Ore                                       | Lit                                        | Lit                                        |
| Accessible         | WCAG AA                                     | WCAG AA                                    | WCAG AA                                    |
| Framework agnostic | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

<div class="decision-callout">

**Use Refine when** you want accessible web components that match the Vielzeug design system without a heavy framework dependency.

**Consider Shoelace or Material Web** if your team is already standardized on those ecosystems and you need their established component catalogs.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/refine
```

```sh [npm]
npm install @vielzeug/refine
```

```sh [yarn]
yarn add @vielzeug/refine
```

:::

## Quick Start

```ts
// 1. Import global styles once
import '@vielzeug/refine/styles';

// 2. Register only the elements you need
import '@vielzeug/refine/button';
import '@vielzeug/refine/input';
import '@vielzeug/refine/card';
```

```html
<ore-button variant="solid" color="primary">Save</ore-button>
<ore-input label="Email" type="email" required></ore-input>
<ore-card padding="lg">
  <span slot="header">Account</span>
  <p>Card content goes here.</p>
</ore-card>
```

```ts
// Or register everything at once
import '@vielzeug/refine/styles';
import '@vielzeug/refine';
```

### CDN / Vanilla HTML

Use the self-contained IIFE bundle to load Refine directly from a CDN in any HTML page — no build step required:

```html
<!-- 1. Styles -->
<link rel="stylesheet" href="https://unpkg.com/@vielzeug/refine/dist/styles/styles.css" />

<!-- 2. All components (IIFE — registers global Refine namespace) -->
<script src="https://unpkg.com/@vielzeug/refine/dist/refine.iife.js"></script>
```

For bundler-based projects that still want a CDN URL, use the ESM bundle via an import map:

```html
<script type="importmap">
  {
    "imports": {
      "@vielzeug/refine": "https://esm.sh/@vielzeug/refine",
      "@vielzeug/refine/button": "https://esm.sh/@vielzeug/refine/button",
      "@vielzeug/refine/input": "https://esm.sh/@vielzeug/refine/input"
    }
  }
</script>

<script type="module">
  import '@vielzeug/refine/button';
  import '@vielzeug/refine/input';
</script>
```

### Package Entry Points

| Import                   | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `@vielzeug/refine`        | Register all published components         |
| `@vielzeug/refine/styles` | Global tokens and shared component styles |
| `@vielzeug/refine/types`  | Shared TypeScript types                   |

Component registration happens through side-effect imports such as `@vielzeug/refine/button` and `@vielzeug/refine/dialog`.

Headless widget controllers (`createTextField`, `createListControl`, `createOverlayControl`, and others) are exported directly from `@vielzeug/refine` alongside component types.

### Components

**Content:** `ore-avatar`, `ore-avatar-group`, `ore-breadcrumb`, `ore-card`, `ore-carousel`, `ore-carousel-slide`, `ore-icon`, `ore-pagination`, `ore-separator`, `ore-table`, `ore-text`

**Disclosure:** `ore-accordion`, `ore-accordion-item`, `ore-tabs`, `ore-tab-item`, `ore-tab-panel`

**Feedback:** `ore-alert`, `ore-async`, `ore-badge`, `ore-chip`, `ore-password-strength`, `ore-progress`, `ore-skeleton`, `ore-toast`

**Inputs:** `ore-button`, `ore-button-group`, `ore-calendar`, `ore-checkbox`, `ore-checkbox-group`, `ore-column`, `ore-combobox`, `ore-datagrid`, `ore-date-picker`, `ore-file-input`, `ore-form`, `ore-input`, `ore-number-input`, `ore-otp-input`, `ore-radio`, `ore-radio-group`, `ore-rating`, `ore-select`, `ore-slider`, `ore-switch`, `ore-textarea`, `ore-time-picker`

**Layout:** `ore-box`, `ore-grid`, `ore-grid-item`, `ore-navbar`, `ore-sidebar`

**Overlay:** `ore-command-palette`, `ore-command-palette-item`, `ore-dialog`, `ore-drawer`, `ore-menu`, `ore-popover`, `ore-tooltip`

## Features

<div class="features-grid">

- **Accessible** — keyboard navigation, ARIA wiring, and focus management across interactive components
- **Themeable** — global tokens plus component-level CSS custom properties
- **Framework agnostic** — works anywhere HTML can be rendered
- **Tree-shakeable** — import only the component entry points you register
- **Comprehensive surface** — inputs, content, disclosure, feedback, layout, and overlay primitives
- **Zero runtime deps** — <PackageInfo package="refine" type="size" /> gzipped

</div>

### Prerequisites

- Browser runtime with Custom Elements support.
- Import `@vielzeug/refine/styles` before rendering components.
- For SSR, render placeholders server-side and hydrate components only on the client.

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ore](/ore/) — Web component runtime that powers Refine
- [Orbit](/orbit/) — Floating UI positioning used in Refine's overlays
- [Forge](/forge/) — Form state management for use with Refine inputs
- [Keymap](/keymap/) — Keyboard shortcut manager that powers the command palette's global trigger

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
