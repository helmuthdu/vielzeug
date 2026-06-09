---
description: Accessible, themeable web components built with Craft for framework and vanilla DOM apps.
package: sigil
category: ui-components
keywords: [web-components, accessible, themeable, ui, components, design-system]
related: [craft, orbit, forge]
exports: [sg-button, sg-input, sg-dialog, sg-select, sg-form, sg-avatar, sg-avatar-group, sg-carousel, sg-datagrid, sg-combobox]
---

# @vielzeug/sigil

> Accessible, themeable web components built with Craft for framework and vanilla DOM apps.

[![npm version](https://img.shields.io/npm/v/@vielzeug/sigil)](https://www.npmjs.com/package/@vielzeug/sigil) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/sigil` &nbsp;·&nbsp; **Category:** UI Components

**Key exports (custom elements):** `sg-button`, `sg-button-group`, `sg-input`, `sg-select`, `sg-combobox`, `sg-dialog`, `sg-drawer`, `sg-form`, `sg-avatar`, `sg-avatar-group`, `sg-carousel`, `sg-datagrid`, `sg-date-picker`, `sg-time-picker`, `sg-tabs`, `sg-toast`

**When to use:** Accessible, themeable web components built with Craft for framework and vanilla DOM apps.

**Related:** [@vielzeug/craft](https://vielzeug.dev/craft/) · [@vielzeug/orbit](https://vielzeug.dev/orbit/) · [@vielzeug/forge](https://vielzeug.dev/forge/)

</details>

`@vielzeug/sigil` is part of Vielzeug and ships as a TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/sigil
npm install @vielzeug/sigil
yarn add @vielzeug/sigil
```

## Quick Start

```ts
// Required once: design tokens + base component styles
import '@vielzeug/sigil/styles';

// Optional: CSS reset (import separately to opt out)
import '@vielzeug/sigil/styles/preflight.css';

// Register only the components you use
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/card';
import '@vielzeug/sigil/input';
import '@vielzeug/sigil/avatar';
import '@vielzeug/sigil/avatar-group';
import '@vielzeug/sigil/carousel';
import '@vielzeug/sigil/datagrid';
import '@vielzeug/sigil/time-picker';
```

```html
<sg-button variant="solid" color="primary">Save</sg-button>

<sg-input label="Email" type="email" required></sg-input>

<sg-card padding="lg">
  <span slot="header">Account</span>
  <p>Build forms, layouts, overlays, and feedback UI with native custom elements.</p>
</sg-card>

<sg-avatar src="/alice.jpg" name="Alice"></sg-avatar>
<sg-avatar-group max="3">
  <sg-avatar name="Alice"></sg-avatar>
  <sg-avatar name="Bob"></sg-avatar>
  <sg-avatar name="Carol"></sg-avatar>
</sg-avatar-group>

<sg-carousel>
  <sg-carousel-slide>Slide 1</sg-carousel-slide>
  <sg-carousel-slide>Slide 2</sg-carousel-slide>
</sg-carousel>
```

To register everything at once:

```ts
import '@vielzeug/sigil/styles';
import '@vielzeug/sigil';
```

## Documentation

- [Overview](https://vielzeug.dev/sigil/)
- [Usage Guide](https://vielzeug.dev/sigil/usage)
- [API Reference](https://vielzeug.dev/sigil/api)
- [Examples](https://vielzeug.dev/sigil/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
