---
title: Assay Migration
---

# Assay Migration

## Assay 3.1

Assay 3.1 removes surfaces with no consumers outside their own tests.

### Removed `nextTick()`

`nextTick()` duplicated `await Promise.resolve()` for a single microtask boundary. Replace calls with `await Promise.resolve()`; keep `delay()` for real timer dependencies.

### Removed live-region helpers

`queryLiveRegion`, `queryAllLiveRegions`, `waitForLiveRegion`, and `waitForLiveRegionCleared` are removed. jsdom cannot prove assistive-technology speech, so these helpers only asserted DOM attributes and text: query them directly with `within(root).get(...)` and `waitUntil()` instead, or test announcement behavior with browser and assistive-technology tooling.

## Assay 3.0

Assay 3.0 renames retrying assertions and makes wait deadlines hard and cancellable during pending async callbacks.

### Replace `retry()` with `eventually()`

```ts
// Before
await retry(() => expect(status.textContent).toBe('Saved'), {
  message: 'status did not settle',
  timeout: 1000,
});

// After
await eventually(() => expect(status.textContent).toBe('Saved'), {
  message: 'status did not settle',
  timeout: 1000,
});
```

`RetryOptions` is replaced by `EventuallyOptions`. Both `EventuallyOptions` and its `message` field remain available for contextual timeout diagnostics. No compatibility alias is provided.

### Waiting is strictly bounded

`waitUntil()` and `eventually()` now apply one deadline to polling delays and pending asynchronous callbacks. Aborting their signal rejects immediately even while a callback promise is pending. The underlying callback cannot be forcibly stopped, so it should still accept or close over an application signal when it owns cancellable work.

Durations are validated:

- `timeout` and `delay()` milliseconds must be finite and non-negative.
- `interval` must be finite and greater than zero.
- Every duration must be no greater than 2,147,483,647 ms, the platform timer limit.
- Invalid values throw `RangeError` before waiting starts.

## Assay 2.0

Assay 2.0 replaced synthetic interaction abstractions and duplicate query helpers with explicit event dispatch, scoped required queries, and cancellable waits.

### Pass the event type positionally to `fireCustom()`

```ts
// Before
fireCustom(element, { detail: { id: '42' }, type: 'item-added' });

// After
fireCustom(element, 'item-added', { detail: { id: '42' } });
```

`CustomEventOptions` was removed; use the platform `CustomEventInit` type.

### Replace `AssayError.is()` with `instanceof`

```ts
// Before
if (AssayError.is(error)) { /* ... */ }

// After
if (error instanceof AssayError) { /* ... */ }
```

### Replace synthetic interactions

Use `fire*()` helpers or `dispatch()` when a unit test intentionally drives an event listener. Use browser automation when correctness depends on activation, focus sequencing, hit testing, layout, or trusted events.

### Scope required queries

```ts
const view = within(container);
const submit = view.get('button[type="submit"]');
```

Use required `get*()` methods when absence is a test failure and nullable `query*()` methods for expected absence.

## Upgrade Checklist

- Replace `retry()` with `eventually()` and `RetryOptions` with `EventuallyOptions`.
- Keep diagnostic `message` values where they improve timeout failures.
- Replace invalid or infinite wait durations with finite supported values.
- Pass the event type positionally to `fireCustom()`.
- Replace `AssayError.is()` with `instanceof AssayError`.
- Keep browser-default interaction assertions in browser-driven tests.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current contracts.
