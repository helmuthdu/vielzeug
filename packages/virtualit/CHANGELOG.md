# Change Log - @vielzeug/virtualit

This log was last generated on Sat, 04 Apr 2026 13:30:02 GMT and should not be manually modified.

## 2.1.0
Sat, 04 Apr 2026 13:30:02 GMT

### Minor changes

- General Improvements and Bugfixes

## 2.0.0
Tue, 24 Mar 2026 22:12:47 GMT

### Breaking changes

- Major release: virtual list engine for performant rendering of large datasets; createVirtualizer() attaches directly to a scroll container; dynamic item count and estimateSize (fixed number or per-index function); getVirtualItems() returns only the visible slice with pixel-accurate top/height values; measureElement() for variable-height items after DOM measurement; scrollToIndex() with start/end/center/auto alignment and scroll behavior; scrollToOffset() for pixel-level scroll control; overscan control; invalidate() to force recalculation; [Symbol.dispose]() support

