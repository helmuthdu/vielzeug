---
title: Sigil — Web component library
description: Accessible, themeable web components built with Craft for framework and vanilla DOM apps.
package: sigil
category: ui-components
keywords: [web-components, accessible, themeable, ui, components, design-system]
related: [craft, orbit, forge]
exports: [bit-button, bit-input, bit-dialog, bit-select, bit-form]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="sigil" />

<img src="/logo-sigil.svg" alt="Sigil logo" width="156" class="logo-highlight"/>

# Sigil

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/sigil` &nbsp;·&nbsp; **Category:** Ui Components

**Key exports:** `bit-button`, `bit-input`, `bit-dialog`, `bit-select`, `bit-form`

**When to use:** Production-ready accessible UI components without building from scratch. Drop-in web components that work in any framework.

**Related:** [Craft](/craft/) · [Orbit](/orbit/) · [Forge](/forge/)

</details>

**Sigil** is the Vielzeug component library: accessible, themeable web components built with [@vielzeug/craft](/craft/). It works with vanilla Document Object Model (DOM) code and framework apps through standards-based custom elements and tree-shakeable registration entry points.


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
<bit-button variant="solid" color="primary">Save</bit-button>
<bit-input label="Email" type="email" required></bit-input>
<bit-card padding="lg">
  <span slot="header">Account</span>
  <p>Card content goes here.</p>
</bit-card>
```

```ts
// Or register everything at once
import '@vielzeug/sigil/styles';
import '@vielzeug/sigil';
```

### Package Entry Points

| Import                     | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| `@vielzeug/sigil`        | Register all published components         |
| `@vielzeug/sigil/styles` | Global tokens and shared component styles |
| `@vielzeug/sigil/types`  | Shared TypeScript types                   |

Component registration happens through side-effect imports such as `@vielzeug/sigil/button` and `@vielzeug/sigil/dialog`.

Headless widget controllers (`createTextField`, `createListControl`, `createOverlayControl`, and others) are exported directly from `@vielzeug/sigil` alongside component types.

### Components

**Content:** `bit-avatar`, `bit-breadcrumb`, `bit-card`, `bit-pagination`, `bit-separator`, `bit-table`, `bit-text`

**Disclosure:** `bit-accordion`, `bit-accordion-item`, `bit-tabs`, `bit-tab-item`, `bit-tab-panel`

**Feedback:** `bit-alert`, `bit-async`, `bit-badge`, `bit-chip`, `bit-password-strength`, `bit-progress`, `bit-skeleton`, `bit-toast`

**Inputs:** `bit-button`, `bit-button-group`, `bit-checkbox`, `bit-checkbox-group`, `bit-combobox`, `bit-file-input`, `bit-form`, `bit-input`, `bit-number-input`, `bit-otp-input`, `bit-radio`, `bit-radio-group`, `bit-rating`, `bit-select`, `bit-slider`, `bit-switch`, `bit-textarea`

**Layout:** `bit-box`, `bit-grid`, `bit-grid-item`, `bit-navbar`, `bit-sidebar`

**Overlay:** `bit-dialog`, `bit-drawer`, `bit-menu`, `bit-popover`, `bit-tooltip`

## Why Sigil?

Every project needs UI primitives. Sigil provides accessible web components that work natively anywhere HTML is rendered—no framework required.

```html
<!-- Before — roll your own button with ARIA -->
<button class="btn btn-primary" role="button" aria-pressed="false" tabindex="0">
  <span class="btn-spinner" aria-hidden="true"></span>
  Save
</button>

<!-- After — Sigil -->
<bit-button variant="primary" loading>Save</bit-button>
```

| Feature            | Sigil                                       | Shoelace | Material Web |
| ------------------ | --------------------------------------------- | -------- | ------------ |
| Bundle size        | <PackageInfo package="sigil" type="size" /> | ~145 kB  | ~200 kB      |
| Built with         | Craft                                       | Lit      | Lit          |
| Accessible         | WCAG AA                                       | WCAG AA  | WCAG AA      |
| Framework agnostic | ✅                                            | ✅       | ✅           |

**Use Sigil when** you want accessible web components that match the Vielzeug design system without a heavy framework dependency.

**Consider Shoelace or Material Web** if your team is already standardized on those ecosystems and you need their established component catalogs.

## Features

- **Accessible** — keyboard navigation, ARIA wiring, and focus management across interactive components
- **Themeable** — global tokens plus component-level CSS custom properties
- **Framework agnostic** — works anywhere HTML can be rendered
- **Tree-shakeable** — import only the component entry points you register
- **Comprehensive surface** — inputs, content, disclosure, feedback, layout, and overlay primitives
- **Zero runtime deps** — <PackageInfo package="sigil" type="size" /> gzipped

## Compatibility

| Environment | Support       |
| ----------- | ------------- |
| Browser     | ✅            |
| Node.js     | ❌ (DOM only) |
| SSR         | ❌ (DOM only) |
| Deno        | ❌            |

### Prerequisites

- Browser runtime with Custom Elements support.
- Import `@vielzeug/sigil/styles` before rendering components.
- For SSR, render placeholders server-side and hydrate components only on the client.

## See Also

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Craft](/craft/)
- [Orbit](/orbit/)
- [Forge](/forge/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
