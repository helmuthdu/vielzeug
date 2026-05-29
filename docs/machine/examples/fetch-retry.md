---
title: 'Machine Examples — Fetch with Retry'
description: 'Data fetching with automatic retry logic using @vielzeug/machine.'
---

## Fetch with Retry

### Problem

Network requests fail unpredictably. Retrying manually in every component leads to duplicate logic and inconsistent retry strategies. Guard conditions provide a natural way to limit retry attempts and escalate to an error state after exhausting retries.

### Solution

Track retry count in context, use guard conditions to allow retries only if count < limit, and transition to error state when retries are exhausted.

```ts
import { assign, defineMachine, interpret } from '@vielzeug/machine';

type FetchContext = {
  data: string;
  error: string;
  retries: number;
};

type FetchEvent =
  | { type: 'FETCH' }
  | { type: 'SUCCESS'; data: string }
  | { type: 'FAILURE'; error: string }
  | { type: 'RETRY' }
  | { type: 'GIVE_UP' };

const fetchMachine = defineMachine<
  'idle' | 'loading' | 'success' | 'failed' | 'error',
  FetchContext,
  FetchEvent
>({
  initial: 'idle',
  context: { data: '', error: '', retries: 0 },
  states: {
    idle: {
      on: {
        FETCH: [
          {
            target: 'loading',
            actions: [assign(() => ({ retries: 0, error: '' }))],
          },
        ],
      },
    },
    loading: {
      invoke: [
        {
          src: async () =>
            fetch('/api/data', { signal: AbortSignal.timeout(5000) })
              .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.text();
              }),
          onDone: (data) => ({ type: 'SUCCESS', data }),
          onError: (error) => ({ type: 'FAILURE', error: String(error) }),
        },
      ],
      on: {
        SUCCESS: [
          {
            target: 'success',
            actions: [assign(({ event }) => ({ data: event.data }))],
          },
        ],
        FAILURE: [
          {
            target: 'failed',
            actions: [
              assign(({ event, context }) => ({
                error: event.error,
                retries: context.retries + 1,
              })),
            ],
          },
        ],
      },
    },
    success: {
      on: {
        FETCH: [
          {
            target: 'loading',
            actions: [assign(() => ({ retries: 0, error: '' }))],
          },
        ],
      },
    },
    failed: {
      on: {
        RETRY: [
          {
            guard: ({ context }) => context.retries < 3,
            target: 'loading',
          },
        ],
        GIVE_UP: [{ target: 'error' }],
      },
    },
    error: {
      on: {
        FETCH: [
          {
            target: 'loading',
            actions: [assign(() => ({ retries: 0, error: '' }))],
          },
        ],
      },
    },
  },
});

const fetcher = interpret(fetchMachine);

fetcher.send({ type: 'FETCH' }); // state: 'loading'

// Simulate fetch failure
setTimeout(() => {
  // After 5s timeout: state → 'failed', retries: 1
  if (fetcher.state.value === 'failed') {
    fetcher.send({ type: 'RETRY' }); // state: 'loading' (retry 1)
  }
}, 5100);

// After second retry fails (5s later)
setTimeout(() => {
  if (fetcher.state.value === 'failed') {
    fetcher.send({ type: 'RETRY' }); // state: 'loading' (retry 2)
  }
}, 10100);

// After third retry fails (5s later)
setTimeout(() => {
  if (fetcher.state.value === 'failed') {
    fetcher.send({ type: 'RETRY' }); // state: 'loading' (retry 3)
  }
}, 15100);

// After all retries exhausted
setTimeout(() => {
  if (fetcher.state.value === 'failed' && fetcher.context.value.retries >= 3) {
    fetcher.send({ type: 'GIVE_UP' }); // state: 'error'
  }
}, 20100);

// Once in error state, can only retry by starting fresh
fetcher.send({ type: 'FETCH' }); // state: 'loading', retries reset to 0
```

### Pitfalls

- **Guard condition doesn't retry automatically** — Reaching the failed state doesn't automatically retry. UI must detect `state.value === 'failed'` and call `send({ type: 'RETRY' })`, or use a timer to auto-retry.
- **Retry count increments but isn't reset on success** — If a retry succeeds, make sure to reset retries to 0 when restarting a fetch. The example above does this in the FETCH action with `assign(() => ({ retries: 0 }))`.
- **AbortSignal.timeout doesn't exist in older Node versions** — Use AbortSignal.timeout() only in Node 18+ or modern browsers. For older environments, wrap fetch in a Promise.race() with a manual timeout.
- **Silent guard failure blocks retry indefinitely** — If the guard fails (retries >= 3), sending RETRY does nothing. No error is thrown. Always provide a GIVE_UP action or automatic transition to error state.

### Related

- [Form with Validation](./form-validation.md) — Guard conditions for input validation
- [Courier documentation](/courier/) — HTTP client with built-in caching and mutations
- [Toolkit documentation](/toolkit/) — Utility functions for async operations
