---
title: Clockwork Migration
---

# Clockwork 3.0 Migration

Clockwork 3.0 simplifies machine-failure handling, isolates consumer observers, and hardens compiled definitions and snapshots. The descriptive `MachineSnapshot` name remains public.

## Remove `ActorErrorDisposition`

`ActorOptions.onError` no longer returns `'continue'` or `'dispose'`. Reducer, guard, effect, invoke, timer, and transition-limit failures are fail-stop and always dispose the actor after observation.

```ts
// Before
const actor = machine.createActor({
  onError(error, context) {
    report(error, context);
    return 'continue';
  },
});

// After
const actor = machine.createActor({
  onError(error, context) {
    report(error, context);
  },
});
```

Subscriber failures are observational rather than machine failures: they are reported through `onError`, remaining subscribers and declared effects continue, and the actor stays active. Errors thrown by `onError` itself are swallowed so observation cannot change synchronous, timer, or invoke behavior.

`actor.can()` applies the fatal transition policy when a guard throws and returns `false` after disposal. The pure `machine.can()` method still throws guard failures directly.

## Treat snapshots as immutable values

`MachineSnapshot` remains the exported type. Clockwork now shallow-clones and freezes snapshot containers and their context records. Reducers must return replacement context instead of mutating retained records.

```ts
const result = machine.transition(machine.initialSnapshot, { type: 'SAVE' });
console.log(Object.isFrozen(result.snapshot)); // true
console.log(Object.isFrozen(result.snapshot.context)); // true
```

Nested values are not deep-cloned or deep-frozen. Make nested replacements in reducers and validate application-specific fields before restoring persisted data.

Pure `transition()` and `can()` validate snapshot context even when an event is ignored.

## Definition and timer validation

Machine definitions, state maps, state nodes, transitions, and invokes must be plain or null-prototype records rather than arrays or class instances. Invoke callback references are snapshotted during compilation, matching transitions and delayed transitions.

Delayed transitions accept finite values from `0` through `2,147,483,647` milliseconds. Larger values now fail definition validation instead of overflowing platform timers.

## Clockwork 2.0 Migration

Clockwork 2.0 removed the redundant `ClockworkError.is()` type guard. Use `instanceof ClockworkError` to narrow unknown errors.

```ts
// Before
if (ClockworkError.is(error)) {
  report(error.code, error.details);
}

// After
if (error instanceof ClockworkError) {
  report(error.code, error.details);
}
```

Malformed runtime events remain ignored. Active actors emit a development warning when input is not an object with a string `type`; valid unhandled events remain silent.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current machine and actor contracts.
