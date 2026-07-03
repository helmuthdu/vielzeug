# @vielzeug/refine

> Accessible, themeable web components built with Ore for framework and vanilla DOM apps.

[![npm version](https://img.shields.io/npm/v/@vielzeug/refine)](https://www.npmjs.com/package/@vielzeug/refine) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/refine` &nbsp;·&nbsp; **Category:** UI Components

**Key exports (custom elements):** `ore-button`, `ore-button-group`, `ore-input`, `ore-select`, `ore-combobox`, `ore-dialog`, `ore-drawer`, `ore-form`, `ore-avatar`, `ore-avatar-group`, `ore-carousel`, `ore-datagrid`, `ore-date-picker`, `ore-time-picker`, `ore-tabs`, `ore-toast`

**When to use:** Accessible, themeable web components built with Ore for framework and vanilla DOM apps.

**Related:** [@vielzeug/ore](https://vielzeug.dev/ore/) · [@vielzeug/orbit](https://vielzeug.dev/orbit/) · [@vielzeug/forge](https://vielzeug.dev/forge/)

</details>

`@vielzeug/refine` is part of Vielzeug and ships as a TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/refine
npm install @vielzeug/refine
yarn add @vielzeug/refine
```

## Quick Start

```ts
// Required once: design tokens + base component styles
import '@vielzeug/refine/styles';

// Optional: CSS reset (import separately to opt out)
import '@vielzeug/refine/styles/preflight.css';

// Register only the components you use
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/input';
import '@vielzeug/refine/avatar';
import '@vielzeug/refine/avatar-group';
import '@vielzeug/refine/carousel';
import '@vielzeug/refine/datagrid';
import '@vielzeug/refine/time-picker';
```

```html
<ore-button variant="solid" color="primary">Save</ore-button>

<ore-input label="Email" type="email" required></ore-input>

<ore-card padding="lg">
  <span slot="header">Account</span>
  <p>Build forms, layouts, overlays, and feedback UI with native custom elements.</p>
</ore-card>

<ore-avatar src="/alice.jpg" name="Alice"></ore-avatar>
<ore-avatar-group max="3">
  <ore-avatar name="Alice"></ore-avatar>
  <ore-avatar name="Bob"></ore-avatar>
  <ore-avatar name="Carol"></ore-avatar>
</ore-avatar-group>

<ore-carousel>
  <ore-carousel-slide>Slide 1</ore-carousel-slide>
  <ore-carousel-slide>Slide 2</ore-carousel-slide>
</ore-carousel>
```

To register everything at once:

```ts
import '@vielzeug/refine/styles';
import '@vielzeug/refine';
```

## Documentation

- [Overview](https://vielzeug.dev/refine/)
- [Usage Guide](https://vielzeug.dev/refine/usage)
- [API Reference](https://vielzeug.dev/refine/api)
- [Examples](https://vielzeug.dev/refine/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
