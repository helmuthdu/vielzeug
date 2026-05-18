---
description: Accessible, themeable web components built with Craftit for framework and vanilla DOM apps.
package: buildit
category: ui-components
keywords: [web-components, accessible, themeable, ui, components, design-system]
related: [craftit, floatit, formit]
exports: [bit-button, bit-input, bit-dialog, bit-select, bit-form]
---

# @vielzeug/buildit

> Accessible, themeable web components built with Craftit for framework and vanilla DOM apps.

[![npm version](https://img.shields.io/npm/v/@vielzeug/buildit)](https://www.npmjs.com/package/@vielzeug/buildit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/buildit` &nbsp;·&nbsp; **Category:** Ui-components

**Key exports:** `bit-button`, `bit-input`, `bit-dialog`, `bit-select`, `bit-form`

**When to use:** Accessible, themeable web components built with Craftit for framework and vanilla DOM apps.

**Related:** [@vielzeug/craftit](https://vielzeug.dev/craftit/) · [@vielzeug/floatit](https://vielzeug.dev/floatit/) · [@vielzeug/formit](https://vielzeug.dev/formit/)

</details>

`@vielzeug/buildit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/buildit
npm install @vielzeug/buildit
yarn add @vielzeug/buildit
```

## Quick Start

```ts
// Required once: design tokens + base component styles
import '@vielzeug/buildit/styles';

// Register only the components you use
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/card';
import '@vielzeug/buildit/input';
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
import '@vielzeug/buildit/styles';
import '@vielzeug/buildit';
```

## Documentation

- [Overview](https://vielzeug.dev/buildit/)
- [Usage Guide](https://vielzeug.dev/buildit/usage)
- [API Reference](https://vielzeug.dev/buildit/api)
- [Examples](https://vielzeug.dev/buildit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
