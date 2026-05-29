---
description: Accessible, themeable web components built with Craft for framework and vanilla DOM apps.
package: block
category: ui-components
keywords: [web-components, accessible, themeable, ui, components, design-system]
related: [craft, orbit, forge]
exports: [bit-button, bit-input, bit-dialog, bit-select, bit-form]
---

# /block

> Accessible, themeable web components built with Craft for framework and vanilla DOM apps.

[![npm version](https://img.shields.io/npm/v//block)](https://www.npmjs.com/package//block) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/block` &nbsp;·&nbsp; **Category:** Ui-components

**Key exports:** `bit-button`, `bit-input`, `bit-dialog`, `bit-select`, `bit-form`

**When to use:** Accessible, themeable web components built with Craft for framework and vanilla DOM apps.

**Related:** [@vielzeug/craft](https://vielzeug.dev/craft/) · [@vielzeug/orbit](https://vielzeug.dev/orbit/) · [@vielzeug/forge](https://vielzeug.dev/forge/)

</details>

`/block` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /block
npm install /block
yarn add /block
```

## Quick Start

```ts
// Required once: design tokens + base component styles
import '/block/styles';

// Register only the components you use
import '/block/button';
import '/block/card';
import '/block/input';
```

```html
<bit-button variant="solid" color="primary">Save</bit-button>

<bit-input label="Email" type="email" required></bit-input>

<bit-card padding="lg">
  <span slot="header">Account</span>
  <p>Build forms, layouts, overlays, and feedback UI with native custom elements.</p>
</bit-card>
```

To register everything at once:

```ts
import '/block/styles';
import '/block';
```

## Documentation

- [Overview](https://vielzeug.dev/block/)
- [Usage Guide](https://vielzeug.dev/block/usage)
- [API Reference](https://vielzeug.dev/block/api)
- [Examples](https://vielzeug.dev/block/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
