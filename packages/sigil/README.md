---
description: Accessible, themeable web components built with Craft for framework and vanilla DOM apps.
package: sigil
category: ui-components
keywords: [web-components, accessible, themeable, ui, components, design-system]
related: [craft, orbit, forge]
exports: [bit-button, bit-input, bit-dialog, bit-select, bit-form]
---

# @vielzeug/sigil

> Accessible, themeable web components built with Craft for framework and vanilla DOM apps.

[![npm version](https://img.shields.io/npm/v/@vielzeug/sigil)](https://www.npmjs.com/package/@vielzeug/sigil) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/sigil` &nbsp;·&nbsp; **Category:** Ui-components

**Key exports:** `bit-button`, `bit-input`, `bit-dialog`, `bit-select`, `bit-form`

**When to use:** Accessible, themeable web components built with Craft for framework and vanilla DOM apps.

**Related:** [@vielzeug/craft](https://vielzeug.dev/craft/) · [@vielzeug/orbit](https://vielzeug.dev/orbit/) · [@vielzeug/forge](https://vielzeug.dev/forge/)

</details>

`@vielzeug/sigil` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

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

// Register only the components you use
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/card';
import '@vielzeug/sigil/input';
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
