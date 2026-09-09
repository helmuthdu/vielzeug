---
title: Dnd 3.0 Migration
description: Migrate to focused entry points, application-owned rollback, explicit refresh, and Gesture-backed touch sorting.
---

# Dnd 3.0 Migration

Dnd 3.0 separates file-drop and sortable entry points, removes controller-owned rollback, and hardens DOM ownership, callback snapshots, configuration, keyboard controls, and disposal.

### Use focused entry points

```diff
- import { createDropZone, createSortable } from '@vielzeug/dnd';
+ import { createDropZone } from '@vielzeug/dnd/drop';
+ import { createSortable } from '@vielzeug/dnd/sortable';
```

The root remains available for existing imports. Focused subpaths also export their relevant errors and `Disposable` type and support strict NodeNext consumers.

### Move rollback to application history

```diff
- onReorder: ({ ids, setRevert }) => {
-   setOrder(ids);
-   setRevert(() => restoreOrder());
+ onReorder: ({ before, after, item }) => {
+   history.push({ before, item });
+   setOrder(after);
  }

- sortable.revert();
+ history.rollback();
```

`scope.revert()`, `sortable.revert()`, and `setRevert()` are removed. Cross-container `onMove` events add `sourceBeforeIds` and `targetBeforeIds` so one application transaction can restore both lists.

### Rename DOM reconciliation

```diff
- sortable.sync();
+ sortable.refresh();
```

`refresh()` restores semantics from elements no longer returned by `items()` before marking the current direct-child set. Duplicate item keys are excluded, and `applyReorder()` throws `DndError` instead of silently dropping duplicate backing records.

### Recheck interaction boundaries

- `onBeforeReorder` now receives frozen order snapshots before drag or keyboard DOM mutation.
- Reorder, move, and interaction snapshots are frozen; callback failures cannot interrupt Dnd state transitions.
- Keyboard sorting ignores interactive descendants unless they match the configured handle.
- Native touch scrolling is preserved unless the sortable scope enables touch input; `touch.activationDistance` configures Gesture's shared two-dimensional pointer recognizer.
- Disposed scopes reject new sortable registrations.
- `maxFiles` must be a non-negative safe integer; accept patterns and auto-scroll numbers are validated during construction.
- `paste: true` listens on the drop-zone element instead of globally on `window`.
- Disposing a validating drop zone transitions `validating` to `false`.

## 2.0

### Replace the global touch shim

`createTouchDragShim()` and `TouchDragOptions` were removed. Enable touch on each sortable scope instead.

```ts
// Before
createTouchDragShim();
const scope = createSortableScope();

// After
const scope = createSortableScope({ touch: true });
```

Touch input now uses Gesture's Pointer Event recognizer and only accepts sortable items registered to its scope. Its default preview is an inert outline; `touch.preview` may return an element that Dnd clones for the transient preview.

### Move cross-list persistence to the scope

Cross-container moves no longer call `onReorder` once for each affected list. Persist the transaction from `scope.onMove`, which receives the moved item and both final orders. Local keyboard and single-list drag reorders continue to call each sortable's `onReorder`.

```ts
const scope = createSortableScope({
  onMove: ({ itemId, sourceIds, targetIds }) => {
    persistMove(itemId, sourceIds, targetIds);
  },
});
```
