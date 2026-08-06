# Change Log - @vielzeug/assay

This log was last generated on Thu, 06 Aug 2026 07:20:49 GMT and should not be manually modified.

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: replace synthetic user interactions and duplicate queries with explicit dispatch, scoped required queries, and cancellable waits

## 1.0.0
Sun, 26 Jul 2026 06:43:54 GMT

### Breaking changes

- feat(assay)!: initial release — framework-agnostic DOM testing primitives (within/queryByText/queryAllByText, queryInShadow/queryAllInShadow/queryPart/getSlotted, fire.*/createPointerEvent, waitFor/waitForEvent/nextTick/wait, AssayError/AssayTimeoutError). Extracted from @vielzeug/ore/testing so @vielzeug/refine and other DOM-output packages can share the same primitives instead of duplicating them

