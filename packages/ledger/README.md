# @vielzeug/ledger

Serialized reversible command history with cancellation ownership and atomic reactive state.

## Features

- **Reversible commands** — every recorded command has `apply()` and `revert()`
- **Atomic state** — one `Readable<LedgerState>` for queue and history observation
- **Composition** — `compose()` combines reversible commands into one history entry
- **Cancellation** — queued cancelled work never starts; active work receives `AbortSignal`
- **Idle ownership** — `whenIdle()` waits for queued and active work to settle
- **History cap** — non-negative safe-integer retained depth

## Install

```sh
pnpm add @vielzeug/ledger
```

## Quick Start

Submit reversible state transitions and dispose the owner at teardown.

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

Keep irreversible side effects outside Ledger commands. Catch operation failures at your application boundary.

[Full documentation](https://vielzeug.dev/ledger/)
