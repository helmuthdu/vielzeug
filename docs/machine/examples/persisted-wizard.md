---
title: 'Machine Examples — Persisted Wizard'
description: Persisted wizard example for @vielzeug/machine.
---

## Persisted Wizard

### Problem

You need a multi-step form wizard that survives page refreshes — the user should resume from their last completed step rather than starting over.

### Solution

Use `PersistenceAdapter` with `sessionStorage` (or `localStorage` for longer-lived persistence). The machine auto-hydrates from the stored snapshot on `interpret()`, then saves after each transition.

```ts
import { assign, defineMachine, interpret } from '@vielzeug/machine';

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
    confirm:  { on: { BACK: { target: 'details' }, CONFIRM: { target: 'success' } } },
    details:  {
      on: {
        BACK: { target: 'info' },
        SUBMIT_DETAILS: {
          actions: [assign(({ event }) => ({ details: event.details }))],
          target: 'confirm',
        },
      },
    },
    info: {
      on: {
        SUBMIT_INFO: {
          actions: [assign(({ event }) => ({ email: event.email, name: event.name }))],
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
    load:  () => {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ReturnType<typeof m.getSnapshot>) : undefined;
    },
    save:  (snap) => sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snap)),
  },
});

// On wizard completion, clear the stored snapshot
m.send({ type: 'CONFIRM' });
m.clearPersistence(); // removes 'wizard-snapshot' from sessionStorage
```

### With `validateSnapshot`

Add a runtime type guard to discard corrupt or stale snapshots rather than crashing:

```ts
import { MachineError } from '@vielzeug/machine';

const validStates = new Set(['confirm', 'details', 'info', 'success']);

const m = interpret(wizard, {
  persistence: { load, save, clear },
  validateSnapshot: (ctx): ctx is Context =>
    typeof (ctx as Context).name === 'string' &&
    typeof (ctx as Context).email === 'string' &&
    typeof (ctx as Context).details === 'string',
});
```

If `validateSnapshot` returns `false`, `interpret()` throws `MACHINE_INVALID_VALIDATE_CONTEXT`. Catch it to fall back to the initial state:

```ts
try {
  m = interpret(wizard, { persistence, validateSnapshot });
} catch (err) {
  if (err instanceof MachineError) {
    persistence.clear?.();
    m = interpret(wizard, { persistence });
  } else {
    throw err;
  }
}
```

### Pitfalls

- **`[Symbol.dispose]()` does not clear persistence.** Disposing the machine does not remove the stored snapshot. Call `m.clearPersistence()` explicitly at the end of a successful wizard flow.
- **`save` fires on every transition.** For expensive storage operations (e.g. remote persistence), debounce `save` before passing it in.
- **`success` state has no transitions.** If the machine hydrates into `success`, the user is stuck. Either clear persistence on `CONFIRM` (as shown above) or add a `RESTART` transition on `success`.

### Related

- [Auth Flow with Guards](./auth-flow.md) — Context mutation across async states
- [Multi-Step Wizard with Routing](./wizard-with-routing.md) — Sync wizard state with URL
- [API Reference — `PersistenceAdapter`](/machine/api#persistenceadapterstate-ctx)
