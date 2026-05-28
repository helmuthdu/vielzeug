---
title: 'Machinit Examples — Form with Validation'
description: 'Multi-step form with validation at each step using @vielzeug/machinit.'
---

## Form with Validation

### Problem

Building a multi-step form where each step validates input before advancing, and users can navigate backward. Without proper state machine patterns, managing step transitions, validation errors, and form state becomes scattered across components.

### Solution

Use state nodes with guard conditions to validate input before advancing, and `assign()` to track progress and capture form data at each step.

```ts
import { assign, defineMachine, interpret } from '@vielzeug/machinit';

type FormContext = {
  step: number;
  data: { email: string; password: string; name: string };
  errors: Record<string, string>;
};

type FormEvent =
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SUBMIT'; data: Record<string, string> }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_FAILURE'; error: string }
  | { type: 'RESET' };

const formMachine = defineMachine<
  'step1' | 'step2' | 'step3' | 'submitting' | 'success' | 'error',
  FormContext,
  FormEvent
>({
  initial: 'step1',
  context: {
    step: 1,
    data: { email: '', password: '', name: '' },
    errors: {},
  },
  states: {
    step1: {
      on: {
        NEXT: [
          {
            guard: ({ context }) => context.data.email.includes('@'),
            target: 'step2',
            actions: [assign(({ context }) => ({ step: 2 }))],
          },
        ],
        RESET: [
          {
            target: 'step1',
            actions: [
              assign(() => ({
                step: 1,
                data: { email: '', password: '', name: '' },
                errors: {},
              })),
            ],
          },
        ],
      },
    },
    step2: {
      on: {
        NEXT: [
          {
            guard: ({ context }) => context.data.password.length >= 8,
            target: 'step3',
            actions: [assign(({ context }) => ({ step: 3 }))],
          },
        ],
        PREV: [{ target: 'step1', actions: [assign(({ context }) => ({ step: 1 }))] }],
        RESET: [{ target: 'step1' }],
      },
    },
    step3: {
      on: {
        PREV: [{ target: 'step2', actions: [assign(({ context }) => ({ step: 2 }))] }],
        SUBMIT: [
          {
            guard: ({ context }) => context.data.name.length > 0,
            target: 'submitting',
            actions: [assign(({ event }) => ({ data: event.data }))],
          },
        ],
        RESET: [{ target: 'step1' }],
      },
    },
    submitting: {
      invoke: [
        {
          src: async ({ context }) =>
            fetch('/api/register', {
              method: 'POST',
              body: JSON.stringify(context.data),
            }).then(r => {
              if (!r.ok) throw new Error('Registration failed');
              return r.json();
            }),
          onDone: () => ({ type: 'SUBMIT_SUCCESS' }),
          onError: (error) => ({ type: 'SUBMIT_FAILURE', error: String(error) }),
        },
      ],
      on: {
        SUBMIT_SUCCESS: [{ target: 'success' }],
        SUBMIT_FAILURE: [
          {
            target: 'error',
            actions: [assign(({ event }) => ({ errors: { submit: event.error } }))],
          },
        ],
      },
    },
    success: {
      on: {
        RESET: [{ target: 'step1' }],
      },
    },
    error: {
      on: {
        RESET: [{ target: 'step1' }],
      },
    },
  },
});

const form = interpret(formMachine);

console.log(form.state.value); // 'step1'
console.log(form.context.value.step); // 1

// Try to advance without email — guard blocks transition
form.send({ type: 'NEXT' }); // Blocked by guard, stays at step1

// Set valid email first (in real usage, from input binding)
form.context.value.data.email = 'user@example.com';
form.send({ type: 'NEXT' }); // Passes guard, state: 'step2'

// Advance with password validation
form.context.value.data.password = 'secure123';
form.send({ type: 'NEXT' }); // Passes guard, state: 'step3'

// Submit form
form.context.value.data.name = 'John';
form.send({ type: 'SUBMIT', data: { email: 'user@example.com', password: 'secure123', name: 'John' } });
// state: 'submitting' → 'success'

// Can reset to start over
form.send({ type: 'RESET' }); // state: 'step1', all data cleared
```

### Pitfalls

- **Guard conditions block transitions silently** — Sending NEXT without valid data won't throw; the state stays the same. Use context subscribers to detect stuck states.
- **Context mutations don't trigger validation** — Modifying `form.context.value.data.email` directly doesn't validate. Always use `send()` to trigger guards; use reactive bindings to update context atomically.
- **Forgetting to capture event data** — If you dispatch `{ type: 'SUBMIT', data: {...} }` but the action doesn't call `assign()` with `event.data`, the form data won't be saved. Always capture via `assign()`.
- **invoke onError receives Error, not string** — In the `onError` handler, the second argument is an Error object; convert to string with `String(error)` before storing in context.

### Related

- [Fetch with Retry](./fetch-retry.md) — Similar guard pattern for retry limits
- [Stateit documentation](/stateit/) — Reactive state tracking for form inputs
- [Permit documentation](/permit/) — Role-based validation logic on top of form states
