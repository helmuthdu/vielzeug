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
<bdt-button variant="primary" @click="handleClick">Save</bdt-button>
<bdt-input label="Email" type="email" required></bdt-input>
<bdt-card>
  <bdt-text slot="title">Card Title</bdt-text>
  <p>Card content goes here.</p>
</bdt-card>
```

```ts
// Or register individually
import { BdtButton, BdtInput } from '@vielzeug/buildit';
```

## Components

**Base:** `bdt-button`, `bdt-button-group`, `bdt-card`, `bdt-text`, `bdt-accordion`, `bdt-accordion-item`

**Form:** `bdt-checkbox`, `bdt-input`, `bdt-radio`, `bdt-slider`, `bdt-switch`

**Layout:** `bdt-box`, `bdt-grid`, `bdt-grid-item`

## Features

- **Accessible** — WCAG 2.1 AA with keyboard navigation and screen reader support
- **Customizable** — CSS custom properties for complete styling control
- **Theme support** — built-in light/dark mode
- **Framework agnostic** — works anywhere HTML can be rendered
- **Tree-shakeable** — import only the components you need
- **Zero runtime deps** — <PackageInfo package="buildit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Theming, customization, and accessibility patterns |
| [API Reference](./api.md) | Component props, events, and CSS variables |
| [Examples](./examples.md) | Framework integration recipes |
