---
title: 'Assay Examples — Waiting for Async Updates'
description: 'Waiting for Async Updates example for @vielzeug/assay.'
---

## Waiting for Async Updates

### Problem

An interaction triggers an asynchronous update (a debounced handler, a reactive framework's next render, a `fetch` call) and you need to assert on the result without a fixed `setTimeout` in every test.

### Solution

Use `waitFor()` to poll until the expected state appears, or `waitForEvent()` when the code under test dispatches an event you can listen for instead.

```ts
import { fire, waitFor, waitForEvent, within } from '@vielzeug/assay';

const form = document.querySelector('.search-form')!;
const { query } = within(form);

fire.input(query('input')!, { bubbles: true });

// Debounced search — poll until the result list renders.
await waitFor(() => query('.results')?.children.length ?? 0 > 0);

// Or, if the component dispatches a 'search-complete' event once done:
const eventPromise = waitForEvent(form, 'search-complete');

fire.submit(form);

await eventPromise;
```

#### With a Custom Timeout

Slow environments (CI, a debounce longer than the 1000ms default) need a longer window:

```ts
await waitFor(() => query('.results')?.children.length ?? 0 > 0, { timeout: 5000, interval: 100 });
```

### Pitfalls

- `waitFor()`'s default 1000ms timeout is tuned for typical reactive UI updates — raise it explicitly for anything involving real network calls or long debounces, rather than lowering test reliability by guessing.
- A `waitFor()` callback that throws on every attempt (e.g. an `expect()` assertion that's never true) re-throws that assertion's own error on timeout, not `AssayTimeoutError` — write assertions with clear failure messages so the timeout is diagnosable.
- `waitForEvent()` only resolves on the *next* matching event — if the event may have already fired before you start listening, use `waitFor()` against the resulting DOM state instead.

### Related

- [Custom Element Interaction](./custom-element-interaction.md)
- [Assay API Reference — Async Waiting](/assay/api#async-waiting)
