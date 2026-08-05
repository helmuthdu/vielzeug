---
title: Assay 2.0 Migration
---

# Assay 2.0 Migration

Assay 2.0 replaces synthetic user interactions and duplicate query helpers with explicit event dispatch, scoped required queries, and cancellable waits.

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
