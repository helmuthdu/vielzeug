---
title: Dnd 2.0 Migration
---

# Dnd 2.0 Migration

## Replace the global touch shim

`createTouchDragShim()` and `TouchDragOptions` were removed. Enable touch on each sortable scope instead.

```ts
// Before
createTouchDragShim();
const scope = createSortableScope();

// After
const scope = createSortableScope({ touch: true });
```

Touch input now only recognizes sortable items registered to its scope. Its default preview is an inert outline; `touch.preview` may return an element that Dnd clones for the transient preview.

## Move cross-list persistence to the scope

Cross-container moves no longer call `onReorder` once for each affected list. Persist the transaction from `scope.onMove`, which receives the moved item and both final orders. Local keyboard and single-list drag reorders continue to call each sortable's `onReorder`.

```ts
const scope = createSortableScope({
  onMove: ({ itemId, sourceIds, targetIds }) => {
    persistMove(itemId, sourceIds, targetIds);
  },
});
```
