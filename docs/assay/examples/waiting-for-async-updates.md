---
title: 'Assay Examples — Waiting for Async Updates'
description: 'Waiting for Async Updates example for @vielzeug/assay.'
---

## Waiting for Async Updates

### Problem

An interaction triggers an asynchronous update (a debounced handler, a reactive framework's next render, a `fetch` call) and you need to assert on the result without a fixed `setTimeout` in every test.

### Solution

Use `waitUntil()` to poll an explicit boolean condition, or `waitForEvent()` when the code under test dispatches an
event you can listen for instead.

```ts
import { fireInput, fireSubmit, waitForEvent, waitUntil, within } from '@vielzeug/assay';

const form = document.querySelector('.search-form')!;
const view = within(form);

fireInput(view.get('input'));

// Debounced search — poll until the result list renders.
await waitUntil(() => (view.query('.results')?.children.length ?? 0) > 0);

// Or, if the component dispatches a 'search-complete' event once done:
const eventPromise = waitForEvent(form, 'search-complete');

fireSubmit(form);

await eventPromise;
```

#### With a Custom Timeout

Slow environments (CI, a debounce longer than the 1000ms default) need a longer window:

```ts
await waitUntil(() => (view.query('.results')?.children.length ?? 0) > 0, { timeout: 5000, interval: 100 });
```

### Pitfalls

- `waitUntil()` requires a boolean result. Use `retry()` for a retrying `expect()` assertion.
- `waitUntil()`'s default 1000ms timeout is tuned for typical reactive UI updates — raise it explicitly for long debounces or network calls.
- `waitForEvent()` only resolves on the *next* matching event — if the event may have already fired before listening starts, wait for resulting DOM state instead.

### Related

- [Custom Element Interaction](./custom-element-interaction.md)
- [Assay API Reference — Async Waiting](/assay/api#async-waiting)
