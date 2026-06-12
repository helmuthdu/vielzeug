---
title: 'Clockwork Examples — Persisted Wizard'
description: Persisted wizard example for @vielzeug/clockwork.
---

## Persisted Wizard

### Problem

You need a multi-step form wizard that survives page refreshes — the user should resume from their last completed step rather than starting over.

### Solution

Use `PersistenceAdapter` with `sessionStorage` (or `localStorage` for longer-lived persistence). The machine auto-hydrates from the stored snapshot on `interpret()`, then saves after each transition.

```ts
import { defineMachine, interpret, type MachineSnapshot } from '@vielzeug/clockwork';

type State = 'confirm' | 'details' | 'info' | 'success';
type Context = { details: string; email: string; name: string };
type Event =
  | { type: 'BACK' }
  | { details: string; type: 'SUBMIT_DETAILS' }
  | { email: string; name: string; type: 'SUBMIT_INFO' }
  | { type: 'CONFIRM' };

const wizard = defineMachine<State, Context, Event>({
  context: { details: '', email: '', name: '' },
  initial: 'info',
  states: {
    confirm: { on: { BACK: { target: 'details' }, CONFIRM: { target: 'success' } } },
    details: {
      on: {
        BACK: { target: 'info' },
        SUBMIT_DETAILS: {
          actions: [
            ({ context, event }) => {
              context.details = event.details;
            },
          ],
          target: 'confirm',
        },
      },
    },
    info: {
      on: {
        SUBMIT_INFO: {
          actions: [
            ({ context, event }) => {
              context.email = event.email;
              context.name = event.name;
            },
          ],
          target: 'details',
        },
      },
    },
    success: {},
  },
});

const STORAGE_KEY = 'wizard-snapshot';

const m = interpret(wizard, {
  persistence: {
    clear: () => sessionStorage.removeItem(STORAGE_KEY),
    load: () => {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as MachineSnapshot<State, Context>) : undefined;
    },
    save: (snap) => sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snap)),
  },
});

// On wizard completion, clear persistence manually via the adapter
if (m.state.value === 'success') {
  sessionStorage.removeItem(STORAGE_KEY);
}
```

### Pitfalls

- **Disposal does NOT clear persistence.** The machine persists its last snapshot so it can resume after page refresh or HMR. Clear the storage explicitly when done.
- **Stale snapshots may reference outdated states.** If you rename states between releases, hydration throws `MACHINE_INVALID_SNAPSHOT_STATE`. Wrap `interpret()` in a try/catch and fall back to a fresh machine.
- **`snapshot` option takes priority over persistence.** If you pass `options.snapshot`, `persistence.load()` is not called.

### Related

- [Data Fetching with Error Recovery](./data-fetching.md) — Combining invokes with state transitions
- [API Reference — `PersistenceAdapter`](/clockwork/api#persistenceadapterstate-ctx)
