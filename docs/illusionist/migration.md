---
title: Illusionist — Migration Guide
description: Migrate to Illusionist 3 resource-free instances and validated custom random sources.
---

[[toc]]

## Illusionist 3.1

Illusionist 3.1 removes the per-category import subpaths. Every category function was already re-exported from the root entry, and the standalone subpaths had no consumers outside the package's own build.

### Category subpaths removed

`@vielzeug/illusionist/seed`, `/person`, `/internet`, `/commerce`, `/date`, `/finance`, `/location`, `/lorem`, and `/system` are gone. Import from the root instead — the symbols are identical:

```ts
// Before
import { createSeed, mulberry32 } from '@vielzeug/illusionist/seed';

// After
import { createSeed, mulberry32 } from '@vielzeug/illusionist';
```

The `/locales`, `/locales/en`, and `/locales/de` subpaths remain: locale data is the one surface that benefits from a separate tree-shakeable entry, and the root deliberately does not statically import it.

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
