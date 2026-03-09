---
title: Buildit — Web component library
description: Accessible, customizable web components built with Craftit. Works with any framework or vanilla JS.
---

<PackageBadges package="buildit" />

<img src="/logo-buildit.svg" alt="Buildit Logo" width="156" class="logo-highlight"/>

# Buildit

**Buildit** is a collection of accessible, customizable web components built with [@vielzeug/craftit](../craftit/). Works with React, Vue, Svelte, Angular, or vanilla JS.

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

```html
<!-- Register all components -->
<script type="module">
  import '@vielzeug/buildit';
</script>

<!-- Use them in HTML -->
<bit-button variant="primary" @click="handleClick">Save</bit-button>
<bit-input label="Email" type="email" required></bit-input>
<bit-card>
  <bit-text slot="header">Card Title</bit-text>
  <p>Card content goes here.</p>
</bit-card>
```

```ts
// Or register individually
import { BdtButton, BdtInput } from '@vielzeug/buildit';
```

## Components

**Base:** `bit-button`, `bit-button-group`, `bit-card`, `bit-text`, `bit-accordion`, `bit-accordion-item`, `bit-tabs`, `bit-tab-item`, `bit-tab-panel`, `bit-badge`, `bit-alert`, `bit-tooltip`, `bit-dialog`

**Form:** `bit-checkbox`, `bit-combobox`, `bit-file-input`, `bit-form`, `bit-input`, `bit-radio`, `bit-radio-group`, `bit-select`, `bit-slider`, `bit-switch`, `bit-textarea`

**Feedback:** `bit-alert`, `bit-badge`, `bit-chip`, `bit-progress`, `bit-skeleton`, `bit-toast`

**Layout:** `bit-box`, `bit-grid`, `bit-grid-item`

## Features

- **Accessible** — WCAG 2.1 AA with keyboard navigation and screen reader support
- **Customizable** — CSS custom properties for complete styling control
- **Theme support** — built-in light/dark mode
- **Framework agnostic** — works anywhere HTML can be rendered
- **Tree-shakeable** — import only the components you need
- **Zero runtime deps** — <PackageInfo package="buildit" type="size" /> gzipped

## Next Steps

|                           |                                                    |
| ------------------------- | -------------------------------------------------- |
| [Usage Guide](./usage.md) | Import patterns, slots, events, and accessibility |
| [API Reference](./api.md) | Component props, events, and CSS variables         |
| [Examples](./examples.md) | Framework integration recipes                      |
