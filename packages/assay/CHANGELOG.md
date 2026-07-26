# Change Log - @vielzeug/assay

This log was last generated on Sun, 26 Jul 2026 06:43:54 GMT and should not be manually modified.

## 1.0.0
Sun, 26 Jul 2026 06:43:54 GMT

### Breaking changes

- feat(assay)!: initial release — framework-agnostic DOM testing primitives (within/queryByText/queryAllByText, queryInShadow/queryAllInShadow/queryPart/getSlotted, fire.*/createPointerEvent, waitFor/waitForEvent/nextTick/wait, AssayError/AssayTimeoutError). Extracted from @vielzeug/ore/testing so @vielzeug/refine and other DOM-output packages can share the same primitives instead of duplicating them

