---
description: Tiny, type-safe reactive primitives — signals, effects, computed values, and object stores. Zero dependencies, works everywhere.
package: ripple
category: state
keywords: [reactive, signals, computed, effects, store, observable, fine-grained, watch, batch, scope, lens]
related: [craft, forge, relay]
exports: [signal, computed, effect, effectAsync, watch, batch, store, untrack, scope, onCleanup, readonly, isSignal, isComputed, isStore]
---

# @vielzeug/ripple

> Tiny, type-safe reactive primitives — signals, effects, computed values, and object stores. Zero dependencies, works everywhere.

[![npm version](https://img.shields.io/npm/v/@vielzeug/ripple)](https://www.npmjs.com/package/@vielzeug/ripple) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/ripple` &nbsp;·&nbsp; **Category:** State

**Key exports:** `signal`, `computed`, `effect`, `effectAsync`, `watch`, `batch`, `store`, `untrack`, `scope`, `onCleanup`, `readonly`, `isSignal`, `isComputed`, `isStore`

**When to use:** Tiny, type-safe reactive primitives — signals, effects, computed values, and object stores. Zero dependencies, works everywhere.

**Related:** [@vielzeug/craft](https://vielzeug.dev/craft/) · [@vielzeug/forge](https://vielzeug.dev/forge/) · [@vielzeug/relay](https://vielzeug.dev/relay/)

</details>

`@vielzeug/ripple` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/ripple
npm install @vielzeug/ripple
yarn add @vielzeug/ripple
```

## Quick Start

```ts
import { signal, computed, effect, store, watch, batch } from '@vielzeug/ripple';

// Signals
const count = signal(0);
const doubled = count.map((n) => n * 2);    // combinator — returns ComputedSignal

const sub = effect(() => {
  console.log('doubled:', doubled.value);   // re-runs when count changes
});

count.value = 5; // → logs "doubled: 10"
sub.dispose();
doubled.dispose();

// Stores with typed lenses
const cart = store({ items: 0, label: 'empty' });
const items = cart.lens('items');           // Signal<number> — cached, path-scoped

items.value = 3;
console.log(cart.value); // { items: 3, label: 'empty' }

// Effect options — scheduler, trace, name
const stop = effect(
  () => console.log('items:', items.value),
  { scheduler: 'microtask', name: 'cart-logger' },
);
stop();
```

## Documentation

- [Overview](https://vielzeug.dev/ripple/)
- [Usage Guide](https://vielzeug.dev/ripple/usage)
- [API Reference](https://vielzeug.dev/ripple/api)
- [Examples](https://vielzeug.dev/ripple/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
