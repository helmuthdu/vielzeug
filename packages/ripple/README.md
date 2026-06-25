---
description: Tiny, type-safe reactive primitives — signals, effects, computed values, and object stores. Zero dependencies, works everywhere.
package: ripple
category: state
keywords: [reactive, signals, computed, effects, store, observable, fine-grained, watch, batch, scope, lens, async]
related: [ore, forge, herald]
exports:
  [
    signal,
    computed,
    effect,
    effectAsync,
    asyncComputed,
    watch,
    batch,
    store,
    storeWithHistory,
    untrack,
    scope,
    asyncScope,
    onCleanup,
    readonly,
    isSignal,
    isComputed,
    isStore,
    getSignalName,
    getDevToolsHook,
  ]
---

# @vielzeug/ripple

> Tiny, type-safe reactive primitives — signals, effects, computed values, and object stores. Zero dependencies, works everywhere.

[![npm version](https://img.shields.io/npm/v/@vielzeug/ripple)](https://www.npmjs.com/package/@vielzeug/ripple) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/ripple` &nbsp;·&nbsp; **Category:** State

**Key exports:** `signal`, `computed`, `effect`, `effectAsync`, `asyncComputed`, `watch`, `batch`, `store`, `storeWithHistory`, `untrack`, `scope`, `asyncScope`, `onCleanup`, `readonly`, `isSignal`, `isComputed`, `isStore`

**When to use:** Fine-grained reactivity without a framework. Powers Ore templates. Works in any TS/JS environment including Node, Deno, and SSR.

**Related:** [@vielzeug/ore](https://vielzeug.dev/ore/) · [@vielzeug/forge](https://vielzeug.dev/forge/) · [@vielzeug/herald](https://vielzeug.dev/herald/)

</details>

`@vielzeug/ripple` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
# pnpm
pnpm add @vielzeug/ripple
# npm
npm install @vielzeug/ripple
# yarn
yarn add @vielzeug/ripple
```

## Sub-paths

| Import                      | Purpose                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| `@vielzeug/ripple`          | Core primitives and types                                                |
| `@vielzeug/ripple/devtools` | `installDevTools`, `debugEffect` — dev-only, tree-shaken from production |
| `@vielzeug/ripple/ssr`      | No-op stubs for server-side rendering                                    |

## Quick Start

```ts
import { signal, computed, effect, store, watch, batch } from '@vielzeug/ripple';

// Signals
const count = signal(0);
const doubled = count.map((n) => n * 2); // combinator — returns OwnedReactive

const sub = effect(() => {
  console.log('doubled:', doubled.value); // re-runs when count changes
});

count.value = 5; // → logs "doubled: 10"
sub.dispose();
doubled.dispose();

// Stores with typed lenses
const cart = store({ items: 0, label: 'empty' });
const items = cart.lens('items'); // Signal<number> — cached, path-scoped

items.value = 3;
console.log(cart.value); // { items: 3, label: 'empty' }

cart.replace((s) => ({ ...s, label: 'checkout' })); // replace entire state via fn
cart.reset();

// Effect options — scheduler, name, custom scheduler fn
const stop = effect(() => console.log('items:', items.value), { scheduler: 'microtask', name: 'cart-logger' });
stop.dispose();

// Async computed — tracks deps and re-runs on change
import { asyncComputed } from '@vielzeug/ripple';

const userId = signal('u1');
const userState = asyncComputed(async (signal) => {
  const id = userId.value; // tracked dep
  return fetch(`/users/${id}`, { signal }).then((r) => r.json());
});
// userState.value → { status: 'idle' | 'pending' | 'fulfilled' | 'error', value, error }

// Store with undo/redo history
import { storeWithHistory } from '@vielzeug/ripple';

const editor = storeWithHistory({ text: '' }, { maxHistory: 50 });
editor.patch({ text: 'hello' });
editor.patch({ text: 'hello world' });
editor.undo(); // back to 'hello'
editor.redo(); // forward to 'hello world'
```

## Documentation

- [Overview](https://vielzeug.dev/ripple/)
- [Usage Guide](https://vielzeug.dev/ripple/usage)
- [API Reference](https://vielzeug.dev/ripple/api)
- [Examples](https://vielzeug.dev/ripple/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
