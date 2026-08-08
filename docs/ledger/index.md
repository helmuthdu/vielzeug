---
title: Ledger — Reversible async history
description: Serialized reversible command history with cancellation ownership and atomic reactive snapshots.
package: ledger
category: utilities
keywords: [undo, redo, history, commands, async, reactive, ripple]
exports: [compose, createLedger]
related: [ripple, keymap, forge, vault]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="ledger" />

## Why Ledger?

Undo and redo require more than array manipulation when operations are asynchronous, cancellable, and visible in a UI. Ledger serializes only reversible commands, owns queue lifecycle, and publishes one atomic state snapshot.

```ts
// Before
const undo = () => changes.pop()?.revert();

// After
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
await ledger.do({ apply: saveNext, revert: restorePrevious });
await ledger.undo();
```

| Feature | Roll your own | Ledger |
| --- | --- | --- |
| Bundle size | 0 B | <PackageInfo package="ledger" type="size" /> |
| Reversible history | Manual arrays | <ore-icon name="check" size="16"></ore-icon> |
| Serialized async work | Manual queue | <ore-icon name="check" size="16"></ore-icon> |
| Queue cancellation | Manual ownership | Abort-aware lifecycle |
| Reactive state | Manual events | `Readable<LedgerState>` |
| Composition | Custom transaction code | `compose()` |

<div class="decision-callout">

**Use Ledger when** you own reversible asynchronous state transitions and need undo, redo, or history UI.

**Consider direct application code when** work is irreversible, fire-and-forget, or does not need history.

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

Submit a reversible command, read state, then dispose its owner.

```ts
import { createLedger } from '@vielzeug/ledger';

let value = 'before';
const ledger = createLedger();

await ledger.do({
  apply: () => { value = 'after'; },
  label: 'Rename value',
  revert: () => { value = 'before'; },
});

await ledger.undo();
console.log(ledger.state.value.undo.length); // 0
ledger.dispose();
```

## Features

<div class="features-grid">

- `createLedger()` — Create serialized reversible command history
- `state` — Read atomic queue, undo, redo, and acceptance state
- `compose()` — Combine reversible commands into one reversible command
- `whenIdle()` — Await queued and active operation settlement
- `LedgerCancelledError` — Distinguish cancellation from execution failure
- `maxHistory` — Keep a non-negative safe-integer undo depth
- `[Symbol.dispose]()` — Seal, abort, and clear a ledger owner

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Ripple](/ripple/) — Consume Ledger `state` through effects or framework bindings.
- [Keymap](/keymap/) — Route undo and redo shortcuts to a Ledger error boundary.
- [Forge](/forge/) — Record reversible form transitions.
- [Vault](/vault/) — Persist application snapshots outside transient undo history.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
