# Change Log - @vielzeug/dragit

This log was last generated on Tue, 24 Mar 2026 22:12:47 GMT and should not be manually modified.

## 2.0.0
Tue, 24 Mar 2026 22:12:47 GMT

### Breaking changes

- Major release: zero-dependency drag-and-drop primitives for file drop zones (createDropZone) and sortable lists (createSortable); file type filtering via accept[], dropEffect control, hover state tracking, and onDropRejected callback; sortable reordering via data-sort-id attributes with drag handle support, onReorder callback, and dynamic list refresh; AbortSignal-free cleanup via destroy() and [Symbol.dispose](); framework-agnostic and SSR-safe

