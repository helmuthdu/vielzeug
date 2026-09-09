---
title: Illusionist — Migration Guide
description: Migrate to Illusionist 3 resource-free instances and validated custom random sources.
---

[[toc]]

## Illusionist 3.0

Illusionist 3 removes lifecycle methods from `createIllusion()` instances. Instances retain only their locale and pseudorandom generator state, own no external resources, and require no cleanup.

### Remove disposal calls

Use an ordinary binding instead of `using`, and remove explicit cleanup calls.

```ts
// Before
using illusion = createIllusion({ seed, locale });
const user = illusion.person.fullName();
```

```ts
// After
const illusion = createIllusion({ seed, locale });
const user = illusion.person.fullName();
```

Remove reads or calls of:

- `dispose()`
- `disposed`
- `disposalSignal`
- `[Symbol.dispose]()`

Creating one instance per test remains useful for deterministic isolation, but no teardown step is required.

### Validate custom random sources

Illusionist now validates values returned by consumer-provided `RandomSource` implementations. `next()` must return a finite number in `[0, 1)`.

```ts
const source: RandomSource = {
  next: () => 0.25,
};
```

Category helpers throw `RangeError` when a custom source returns `NaN`, an infinite value, a negative value, or `1` and above. Sources returned by `createSeed()` and `mulberry32()` already satisfy this contract.

### Upgrade checklist

- Replace `using illusion` with `const illusion`.
- Remove lifecycle method calls and state checks.
- Remove cleanup handlers that only disposed an Illusionist instance.
- Ensure custom `RandomSource.next()` implementations return finite values in `[0, 1)`.
- Update `@vielzeug/illusionist` to version 3.
