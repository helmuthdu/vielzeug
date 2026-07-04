---
title: Ledger — Async undo/redo command history
description: Command-pattern undo/redo with async operations, Ripple signals for reactive state, and composable commands.
package: ledger
category: utilities
keywords: [undo, redo, history, command-pattern, async, reactive, ripple]
exports: [createLedger, compose]
related: [ripple, keymap, forge, vault]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="ledger" />

## Why Ledger?

Undo/redo is deceptively complex: you need to handle async side-effects, prevent concurrent mutations from racing, cap history size, and keep UI buttons reactive. Ledger solves all of this with a clean command-pattern API and Ripple signals.

| Feature                | Roll your own                         | Ledger                                                    |
| ---------------------- | ------------------------------------- | --------------------------------------------------------- |
| Bundle size            | 0 B                                   | <PackageInfo package="ledger" type="size" />              |
| Async commands         | Manual promise chaining               | <ore-icon name="check" size="16"></ore-icon> serialised queue |
| Race prevention        | Manual locks                          | <ore-icon name="check" size="16"></ore-icon> built-in queue |
| Reactive `canUndo`     | Poll or manual events                 | `Computed<boolean>` from Ripple                           |
| Composable commands    | Custom wrapper                        | <ore-icon name="check" size="16"></ore-icon> `compose()`   |
| History cap            | Array slice                           | `maxHistory` option                                       |
| Disposable             | Manual                                | `dispose()` + `using`                                     |

<div class="decision-callout">

**Use Ledger when** you need undo/redo for editors, design tools, form state, or any app with reversible mutations — especially with async side-effects like server persistence.

**Consider a simpler approach when** you only need client-side state undo with a single synchronous mutation and no UI reactivity — `@vielzeug/ripple`'s `storeWithHistory` may be enough.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/ledger
```

```sh [npm]
npm install @vielzeug/ledger
```

```sh [yarn]
yarn add @vielzeug/ledger
```

:::

## Quick Start

```ts
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger({ maxHistory: 50 });

// Execute a reversible command
await ledger.do({
  execute: async () => { item.name = newName; },
  rollback: async () => { item.name = oldName; },
  label: 'Rename item',
});

await ledger.undo(); // runs rollback
await ledger.redo(); // runs execute again

ledger.dispose(); // or: using ledger = createLedger()
```

## Features

<div class="features-grid">

- `createLedger<TData>()` — Creates an async command stack; operations are serialised to prevent races
- Reactive state — `canUndo`, `canRedo`, `historySize`, `isProcessing`, `pendingCount`, `historySnapshot` are Ripple `Computed` values
- `compose()` — Group multiple commands into one atomic undo step; partial failure rolls back already-executed sub-commands; sub-rollback errors reach `onRollbackError`
- `maxHistory` — Cap the undo stack; oldest entries evicted automatically
- Async-safe — `execute()`, `rollback()`, and `clear()` are fully serialised through the queue
- Typed history — `Command.data` stores custom metadata; `historySnapshot.value[n].data` is typed to `TData`
- Error-safe rollback — failed `rollback()` warns via dev console; optional `onRollbackError` callback for UI integration
- Cancellable — `execute`/`rollback` receive an `AbortSignal`, merged from a caller-supplied signal and the ledger's own `disposalSignal`
- Disposable — `dispose()` + `[Symbol.dispose]` for `using` declarations

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ripple](/ripple/) — `canUndo`, `canRedo`, `isProcessing` are Ripple `Computed` values; use `effect()` or bind directly to templates
- [Keymap](/keymap/) — Wire `ctrl+z` / `ctrl+shift+z` to `ledger.undo()` / `ledger.redo()` with zero boilerplate
- [Forge](/forge/) — Combine Ledger with Forge for reversible form mutations
- [Vault](/vault/) — Persist undo history across sessions by storing commands in IndexedDB

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
