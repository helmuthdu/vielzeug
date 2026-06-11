---
title: Sigil — Web component library
description: Accessible, themeable web components built with Craft for framework and vanilla DOM apps.
package: sigil
category: ui-components
keywords: [web-components, accessible, themeable, ui, components, design-system]
related: [craft, orbit, forge]
exports:
  [
    sg-accordion,
    sg-accordion-item,
    sg-alert,
    sg-async,
    sg-avatar,
    sg-avatar-group,
    sg-badge,
    sg-box,
    sg-breadcrumb,
    sg-breadcrumb-item,
    sg-button,
    sg-button-group,
    sg-calendar,
    sg-card,
    sg-carousel,
    sg-carousel-slide,
    sg-checkbox,
    sg-checkbox-group,
    sg-chip,
    sg-column,
    sg-combobox,
    sg-datagrid,
    sg-date-picker,
    sg-dialog,
    sg-drawer,
    sg-file-input,
    sg-form,
    sg-grid,
    sg-grid-item,
    sg-icon,
    sg-input,
    sg-menu,
    sg-menu-item,
    sg-menu-separator,
    sg-navbar,
    sg-navbar-item,
    sg-number-input,
    sg-otp-input,
    sg-pagination,
    sg-password-strength,
    sg-popover,
    sg-progress,
    sg-radio,
    sg-radio-group,
    sg-rating,
    sg-select,
    sg-separator,
    sg-sidebar,
    sg-sidebar-group,
    sg-sidebar-item,
    sg-skeleton,
    sg-slider,
    sg-switch,
    sg-tab-item,
    sg-tab-panel,
    sg-table,
    sg-tabs,
    sg-text,
    sg-textarea,
    sg-time-picker,
    sg-tooltip,
  ]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="sigil" />

## Why Sigil?

Every project needs UI primitives. Sigil provides accessible web components that work natively anywhere HTML is rendered—no framework required.

```html
<!-- Before — roll your own button with ARIA -->
<button class="btn btn-primary" role="button" aria-pressed="false" tabindex="0">
  <span class="btn-spinner" aria-hidden="true"></span>
  Save
</button>

<!-- After — Sigil -->
<sg-button variant="primary" loading>Save</sg-button>
```

| Feature            | Sigil                                       | Shoelace | Material Web |
| ------------------ | ------------------------------------------- | -------- | ------------ |
| Bundle size        | <PackageInfo package="sigil" type="size" /> | ~145 kB  | ~200 kB      |
| Built with         | Craft                                       | Lit      | Lit          |
| Accessible         | WCAG AA                                     | WCAG AA  | WCAG AA      |
| Framework agnostic | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>       | <sg-icon name="check" size="16"></sg-icon>           |

<div class="decision-callout">

**Use Sigil when** you want accessible web components that match the Vielzeug design system without a heavy framework dependency.

**Consider Shoelace or Material Web** if your team is already standardized on those ecosystems and you need their established component catalogs.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/sigil
```

```sh [npm]
npm install @vielzeug/sigil
```

```sh [yarn]
yarn add @vielzeug/sigil
```

:::

## Quick Start

```ts
// 1. Import global styles once
import '@vielzeug/sigil/styles';

// 2. Register only the elements you need
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/input';
import '@vielzeug/sigil/card';
```

```html
<sg-button variant="solid" color="primary">Save</sg-button>
<sg-input label="Email" type="email" required></sg-input>
<sg-card padding="lg">
  <span slot="header">Account</span>
  <p>Card content goes here.</p>
</sg-card>
```

```ts
// Or register everything at once
import '@vielzeug/sigil/styles';
import '@vielzeug/sigil';
```

### CDN / Vanilla HTML

Use the self-contained IIFE bundle to load Sigil directly from a CDN in any HTML page — no build step required:

```html
<!-- 1. Styles -->
<link rel="stylesheet" href="https://unpkg.com/@vielzeug/sigil/dist/styles/styles.css" />

<!-- 2. All components (IIFE — registers global Sigil namespace) -->
<script src="https://unpkg.com/@vielzeug/sigil/dist/sigil.iife.js"></script>
```

For bundler-based projects that still want a CDN URL, use the ESM bundle via an import map:

```html
<script type="importmap">
  {
    "imports": {
      "@vielzeug/sigil": "https://esm.sh/@vielzeug/sigil",
      "@vielzeug/sigil/button": "https://esm.sh/@vielzeug/sigil/button",
      "@vielzeug/sigil/input": "https://esm.sh/@vielzeug/sigil/input"
    }
  }
</script>

<script type="module">
  import '@vielzeug/sigil/button';
  import '@vielzeug/sigil/input';
</script>
```

### Package Entry Points

| Import                   | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `@vielzeug/sigil`        | Register all published components         |
| `@vielzeug/sigil/styles` | Global tokens and shared component styles |
| `@vielzeug/sigil/types`  | Shared TypeScript types                   |

Component registration happens through side-effect imports such as `@vielzeug/sigil/button` and `@vielzeug/sigil/dialog`.

Headless widget controllers (`createTextField`, `createListControl`, `createOverlayControl`, and others) are exported directly from `@vielzeug/sigil` alongside component types.

### Components

**Content:** `sg-avatar`, `sg-avatar-group`, `sg-breadcrumb`, `sg-card`, `sg-carousel`, `sg-carousel-slide`, `sg-icon`, `sg-pagination`, `sg-separator`, `sg-table`, `sg-text`

**Disclosure:** `sg-accordion`, `sg-accordion-item`, `sg-tabs`, `sg-tab-item`, `sg-tab-panel`

**Feedback:** `sg-alert`, `sg-async`, `sg-badge`, `sg-chip`, `sg-password-strength`, `sg-progress`, `sg-skeleton`, `sg-toast`

**Inputs:** `sg-button`, `sg-button-group`, `sg-calendar`, `sg-checkbox`, `sg-checkbox-group`, `sg-column`, `sg-combobox`, `sg-datagrid`, `sg-date-picker`, `sg-file-input`, `sg-form`, `sg-input`, `sg-number-input`, `sg-otp-input`, `sg-radio`, `sg-radio-group`, `sg-rating`, `sg-select`, `sg-slider`, `sg-switch`, `sg-textarea`, `sg-time-picker`

**Layout:** `sg-box`, `sg-grid`, `sg-grid-item`, `sg-navbar`, `sg-sidebar`

**Overlay:** `sg-dialog`, `sg-drawer`, `sg-menu`, `sg-popover`, `sg-tooltip`

## Features

<div class="features-grid">

- **Accessible** — keyboard navigation, ARIA wiring, and focus management across interactive components
- **Themeable** — global tokens plus component-level CSS custom properties
- **Framework agnostic** — works anywhere HTML can be rendered
- **Tree-shakeable** — import only the component entry points you register
- **Comprehensive surface** — inputs, content, disclosure, feedback, layout, and overlay primitives
- **Zero runtime deps** — <PackageInfo package="sigil" type="size" /> gzipped

</div>

### Prerequisites

- Browser runtime with Custom Elements support.
- Import `@vielzeug/sigil/styles` before rendering components.
- For SSR, render placeholders server-side and hydrate components only on the client.

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Craft](/craft/) — Web component runtime that powers Sigil
- [Orbit](/orbit/) — Floating UI positioning used in Sigil's overlays
- [Forge](/forge/) — Form state management for use with Sigil inputs

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
