---
title: Buildit — Web component library
description: Accessible, themeable web components built with Craftit for framework and vanilla DOM apps.
---

<PackageBadges package="buildit" />

<img src="/logo-buildit.svg" alt="Buildit logo" width="156" class="logo-highlight"/>

# Buildit

**Buildit** is the Vielzeug component library: accessible, themeable web components built with [@vielzeug/craftit](/craftit/). It works with vanilla Document Object Model (DOM) code and framework apps through standards-based custom elements and tree-shakeable registration entry points.

<!-- Search keywords: web component library, UI component kit, design system components. -->

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/buildit
```

```sh [npm]
npm install @vielzeug/buildit
```

```sh [yarn]
yarn add @vielzeug/buildit
```

:::

## Quick Start

```ts
// 1. Import global styles once
import '@vielzeug/buildit/styles';

// 2. Register only the elements you need
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';
import '@vielzeug/buildit/card';
```

```html
<bit-button variant="solid" color="primary">Save</bit-button>
<bit-input label="Email" type="email" required></bit-input>
<bit-card padding="lg">
  <span slot="header">Account</span>
  <p>Card content goes here.</p>
</bit-card>
```

```ts
// Or register everything at once
import '@vielzeug/buildit/styles';
import '@vielzeug/buildit';
```

## Package Entry Points

| Import                     | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| `@vielzeug/buildit`        | Register all published components         |
| `@vielzeug/buildit/styles` | Global tokens and shared component styles |
| `@vielzeug/buildit/types`  | Shared TypeScript types                   |

Component registration happens through side-effect imports such as `@vielzeug/buildit/button` and `@vielzeug/buildit/dialog`.

For headless widget controllers (navigation/overlay/selection), use `@vielzeug/craftit/controls`.

## Components

**Content:** `bit-avatar`, `bit-breadcrumb`, `bit-card`, `bit-pagination`, `bit-separator`, `bit-table`, `bit-text`

**Disclosure:** `bit-accordion`, `bit-accordion-item`, `bit-tabs`, `bit-tab-item`, `bit-tab-panel`

**Feedback:** `bit-alert`, `bit-async`, `bit-badge`, `bit-chip`, `bit-password-strength`, `bit-progress`, `bit-skeleton`, `bit-toast`

**Inputs:** `bit-button`, `bit-button-group`, `bit-checkbox`, `bit-checkbox-group`, `bit-combobox`, `bit-file-input`, `bit-form`, `bit-input`, `bit-number-input`, `bit-otp-input`, `bit-radio`, `bit-radio-group`, `bit-rating`, `bit-select`, `bit-slider`, `bit-switch`, `bit-textarea`

**Layout:** `bit-box`, `bit-grid`, `bit-grid-item`, `bit-navbar`, `bit-sidebar`

**Overlay:** `bit-dialog`, `bit-drawer`, `bit-menu`, `bit-popover`, `bit-tooltip`

## Why Buildit?

Every project needs UI primitives. Buildit provides accessible web components that work natively anywhere HTML is rendered—no framework required.

```html
<!-- Before — roll your own button with ARIA -->
<button class="btn btn-primary" role="button" aria-pressed="false" tabindex="0">
  <span class="btn-spinner" aria-hidden="true"></span>
  Save
</button>

<!-- After — Buildit -->
<bit-button variant="primary" loading>Save</bit-button>
```

| Feature            | Buildit                                       | Shoelace | Material Web |
| ------------------ | --------------------------------------------- | -------- | ------------ |
| Bundle size        | <PackageInfo package="buildit" type="size" /> | ~145 kB  | ~200 kB      |
| Built with         | Craftit                                       | Lit      | Lit          |
| Accessible         | WCAG AA                                       | WCAG AA  | WCAG AA      |
| Framework agnostic | ✅                                            | ✅       | ✅           |

**Use Buildit when** you want accessible web components that match the Vielzeug design system without a heavy framework dependency.

**Consider Shoelace or Material Web** if your team is already standardized on those ecosystems and you need their established component catalogs.

## Features

- **Accessible** — keyboard navigation, ARIA wiring, and focus management across interactive components
- **Themeable** — global tokens plus component-level CSS custom properties
- **Framework agnostic** — works anywhere HTML can be rendered
- **Tree-shakeable** — import only the component entry points you register
- **Comprehensive surface** — inputs, content, disclosure, feedback, layout, and overlay primitives
- **Zero runtime deps** — <PackageInfo package="buildit" type="size" /> gzipped

## Compatibility

| Environment | Support       |
| ----------- | ------------- |
| Browser     | ✅            |
| Node.js     | ❌ (DOM only) |
| SSR         | ❌ (DOM only) |
| Deno        | ❌            |

## Prerequisites

- Browser runtime with Custom Elements support.
- Import `@vielzeug/buildit/styles` before rendering components.
- For SSR, render placeholders server-side and hydrate components only on the client.

## See Also

- [Craftit](/craftit/)
- [Floatit](/floatit/)
- [Formit](/formit/)
