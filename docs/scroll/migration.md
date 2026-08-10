---
title: Scroll 2 Migration
description: Migrate Scroll configuration validation and callback updates to Scroll 2.
---

[[toc]]

## Scroll 2 Changes

Scroll 2 validates static virtualizer configuration and lets `update()` replace callbacks and `scrollEndDelay`.

Added export:

- `ScrollConfigurationError`

## Fix Invalid Static Options

Scroll 1 silently normalized many invalid static values. Scroll 2 throws `ScrollConfigurationError` before attaching listeners or applying an update.

| Option | Scroll 2 domain |
| --- | --- |
| `count`, `rowCount`, `colCount` | finite non-negative integer |
| `gap`, `rowGap`, `colGap` | finite non-negative integer |
| `overscan` | finite non-negative integer values |
| numeric size estimates | finite positive number up to `10_000_000` |
| initial offsets, `scrollEndDelay`, stick threshold | finite non-negative number |

Malformed JavaScript values such as `null`, arrays, and strings also throw `ScrollConfigurationError` instead of falling through to browser/runtime errors.

```ts
// Scroll 1: silently treated this as zero
createVirtualizer(element, { count: -1 });

// Scroll 2: provide a valid count
createVirtualizer(element, { count: 0 });
```

Estimator callbacks remain resilient: thrown errors or invalid return values use the default estimate and emit a development warning. Runtime measurements remain no-ops when stale or invalid. Navigation keeps documented clamping/no-op behavior.

## Replace Callbacks Without Recreating

Scroll 1 treated callbacks and `scrollEndDelay` as construction-only.

```ts
// Scroll 1
virtualizer.dispose();
virtualizer = createVirtualizer(element, { count, onChange: renderNext });
```

```ts
// Scroll 2
virtualizer.update({ onChange: renderNext, scrollEndDelay: 100 });
```

`horizontal` and initial offsets remain construction-only.

## Reactive Virtualizers

`createReactiveVirtualizer()` and `createReactiveGroupedVirtualizer()` retain their public API. Their implementation no longer uses a JavaScript `Proxy`; `state`, live getters, methods, disposal, object spreading, and enumeration continue working unchanged. Calling `update({ onChange })` preserves reactive `state` updates and invokes the supplied callback after the signal updates.
