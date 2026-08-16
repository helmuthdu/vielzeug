---
title: Clockwork Migration
---

# Clockwork 2.0 Migration

Clockwork 2.0 removes the redundant `ClockworkError.is()` type guard. Runtime malformed-event diagnostics now warn during development before ignoring invalid input.

## Replace `ClockworkError.is()` with `instanceof`

The static `ClockworkError.is()` method is removed. Use `instanceof ClockworkError` to narrow unknown errors.

```ts
// Before
if (ClockworkError.is(error)) {
  console.error(error.code, error.details);
}

// After
if (error instanceof ClockworkError) {
  console.error(error.code, error.details);
}
```

## Check malformed event dispatches during development

`actor.send()` still ignores malformed runtime values, but now writes a development warning when the value is not an object with a string `type`. Valid event objects without a transition remain silently ignored. TypeScript callers already receive compile-time checking; validate untrusted JavaScript or external input before dispatching it.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current machine and actor contracts.
