---
title: Clockwork Migration
---

# Clockwork 3.0 Migration

Clockwork 3.0 unifies actor observation behind `tap()`, replaces error codes with error subtypes, and hardens definitions and snapshots. The descriptive `MachineSnapshot` name remains public.

## Replace `onError` with `actor.tap()`

`ActorOptions.onError` is gone. Runtime failures are fail-stop: reducer, guard, effect, invoke, timer, and transition-limit failures always dispose the actor after observation. Observation now happens through `actor.tap()`, which also reports transitions, ignored events, and disposal.

```ts
// Before
const actor = machine.createActor({
  onError(error, context) {
    report(error, context);
    return 'continue';
  },
});

// After
const actor = machine.createActor();
actor.tap((event) => {
  if (event.type === 'error') report(event.error, event);
});
```

Subscriber failures are observational rather than machine failures: they are reported as `error` tap events with `phase: 'subscriber'`, remaining subscribers and declared effects continue, and the actor stays active. Errors thrown by a tap handler are swallowed so observation cannot change synchronous, timer, or invoke behavior.

`maxTransitions` is no longer an actor option. The queued-transition limit is a fixed internal guard against runaway loops.

`actor.can()` applies the fatal transition policy when a guard throws and returns `false` after disposal. The pure `machine.can()` method still throws guard failures directly.

## Narrow errors with subtypes

`ClockworkError` no longer carries a `code` string. It is the base class for three subtypes, so `instanceof` replaces string matching:

```ts
// Before
if (error instanceof ClockworkError) {
  report(error.code, error.details);
}

// After
if (error instanceof ClockworkDefinitionError) {
  report('definition', error.details);
}
```

`ClockworkDefinitionError` covers definition validation, `ClockworkSnapshotError` covers snapshot, context, and reducer results, and `ClockworkTransitionLimitError` covers the queued-transition limit.

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

Machine definitions are trusted as typed: targets, callback shapes, and state keys are compiler-checked in the typed definition, and runtime state and event lookups are own-property guarded, so prototype-colliding names such as `__proto__` or `constructor` never read as declared. `defineMachine()` rejects only what types cannot express — a timer `delay` outside `0` through `2,147,483,647` milliseconds (larger values overflow platform timers and fire immediately), an empty transition array, and a `context` that is not a plain record.

Early 3.x releases also re-validated definition structure at runtime; that pass is gone. Definitions that only typechecked through `as unknown as` casts now fail at runtime use with the underlying `TypeError` instead of a definition-time error.

## Clockwork 2.0 Migration

Clockwork 2.0 removed the redundant `ClockworkError.is()` type guard. Use `instanceof ClockworkError` to narrow unknown errors.

Malformed runtime events remain ignored. Active actors emit a development warning when input is not an object with a string `type`; valid unhandled events remain silent.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current machine and actor contracts.
