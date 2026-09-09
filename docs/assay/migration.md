---
title: Assay Migration
---

# Assay Migration

## Assay 3.0

Assay 3.0 renames retrying assertions, makes wait deadlines hard and cancellable during pending async callbacks, completes live-region matching, and clarifies its synthetic-event confidence boundary.

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

`nextTick()` retains an explicit queued-microtask boundary rather than returning an already-resolved promise.

### Live-region matching

Live-region waits inspect every matching region, so text or an empty state in a later region can satisfy the wait. A supplied live-region root is included when it matches. Implicit roles now include:

| Role | Effective politeness |
| --- | --- |
| `alert` | `assertive` |
| `log` | `polite` |
| `status` | `polite` |
| `marquee` | `off` |
| `timer` | `off` |

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
