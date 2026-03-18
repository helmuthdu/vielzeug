---
title: Buildit — Web component library
description: Accessible, customizable web components built with Craftit. Works with any framework or vanilla JS.
---

<PackageBadges package="buildit" />

<img src="/logo-buildit.svg" alt="Buildit Logo" width="156" class="logo-highlight"/>

# Buildit

**Buildit** is the Vielzeug component library: accessible, themeable web components built with [@vielzeug/craftit](/craftit/). It works with vanilla DOM and framework apps alike through standards-based custom elements and tree-shakeable registration entry points.

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

| Import | Purpose |
| --- | --- |
| `@vielzeug/buildit` | Register all published components |
| `@vielzeug/buildit/styles` | Global tokens and shared component styles |
| `@vielzeug/buildit/types` | Shared TypeScript types |

Component registration happens through side-effect imports such as `@vielzeug/buildit/button` and `@vielzeug/buildit/dialog`.

## Components

**Actions:** `bit-button`, `bit-button-group`

**Content:** `bit-avatar`, `bit-breadcrumb`, `bit-card`, `bit-pagination`, `bit-separator`, `bit-table`, `bit-text`

**Disclosure:** `bit-accordion`, `bit-accordion-item`, `bit-tabs`, `bit-tab-item`, `bit-tab-panel`

**Feedback:** `bit-alert`, `bit-badge`, `bit-chip`, `bit-progress`, `bit-skeleton`, `bit-toast`

**Form:** `bit-checkbox`, `bit-checkbox-group`, `bit-combobox`, `bit-file-input`, `bit-form`, `bit-input`, `bit-number-input`, `bit-otp-input`, `bit-radio`, `bit-radio-group`, `bit-rating`, `bit-select`, `bit-slider`, `bit-switch`, `bit-textarea`

**Layout:** `bit-box`, `bit-grid`, `bit-grid-item`, `bit-sidebar`

**Overlay:** `bit-dialog`, `bit-drawer`, `bit-menu`, `bit-popover`, `bit-tooltip`

## Features

- **Accessible** — keyboard navigation, ARIA wiring, and focus management across interactive components
- **Themeable** — global tokens plus component-level CSS custom properties
- **Framework agnostic** — works anywhere HTML can be rendered
- **Tree-shakeable** — import only the component entry points you register
- **Comprehensive surface** — actions, content, disclosure, feedback, form, layout, and overlay primitives
- **Zero runtime deps** — <PackageInfo package="buildit" type="size" /> gzipped

## Next Steps

|                           |                                                    |
| ------------------------- | -------------------------------------------------- |
| [Usage Guide](./usage.md) | Import patterns, slots, events, and accessibility |
| [API Reference](./api.md) | Component props, events, and CSS variables         |
| [Examples](./examples.md) | Framework integration recipes                      |
