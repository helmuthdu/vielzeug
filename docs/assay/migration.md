---
title: Assay Migration
---

# Assay Migration

## Assay 2.0

Assay 2.0 replaces synthetic user interactions and duplicate query helpers with explicit event dispatch, scoped required queries, cancellable waits, and removes the unused `AssayError.is()` type guard, and drops the dead `_dev.ts` module.

### Pass the event type positionally to `fireCustom`

`fireCustom` now takes the event type as its second positional argument, matching `addEventListener(target, type, options)` and the rest of the `fire*` family. The `CustomEventOptions` wrapper type is removed — use the platform `CustomEventInit` directly.

```ts
// Before
import { fireCustom } from '@vielzeug/assay';

fireCustom(element, { detail: { id: '42' }, type: 'item-added' });

// After
import { fireCustom } from '@vielzeug/assay';

fireCustom(element, 'item-added', { detail: { id: '42' } });
```

### Replace `AssayError.is()` with `instanceof`

The static `AssayError.is()` type guard is removed. Use `instanceof AssayError` to narrow unknown values to the Assay error hierarchy.

```ts
// Before
if (AssayError.is(err)) { ... }

// After
if (err instanceof AssayError) { ... }
```

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for the 3.0 event, query, and wait contracts.


## Replace synthetic interactions

Use the `fire*` helpers or `dispatch` to create and dispatch the exact browser event required by a test.

```ts
import { fireClick } from '@vielzeug/assay';

fireClick(button);
```

## Scope required queries

Create a query scope with `within(root)`. Use its required query methods when absence is a test failure; retain nullable queries only for expected absence.

```ts
import { within } from '@vielzeug/assay';

const view = within(container);
const submit = view.get('button[type="submit"]');
```

## Use cancellable waits

Replace ad-hoc polling and timers with `waitUntil`, `waitForEvent`, or `retry`. Pass their options when the wait must be bounded or cancelled.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for the 2.0 query, event, and wait contracts.
