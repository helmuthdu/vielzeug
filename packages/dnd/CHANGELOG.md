# Change Log - @vielzeug/dnd

This log was last generated on Tue, 21 Jul 2026 07:04:16 GMT and should not be manually modified.

## 1.2.1
Tue, 21 Jul 2026 07:04:16 GMT

### Patches

- fix: avoid starting touch drag on tap
- fix: set touch-action:none on sortable items so mobile browsers don't hijack cross-column drags as page scroll

## 1.2.0
Tue, 14 Jul 2026 06:12:09 GMT

### Minor changes

- feat: add createTouchDragShim() to bridge touch gestures to sortable/drop-zone drag events

### Patches

- fix: prevent sortable placeholder oscillation in empty containers

## 1.1.1
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.1.0
Sun, 05 Jul 2026 05:52:18 GMT

### Minor changes

- chore(dnd): rework dnd disposal internals onto AbortSignal, drop unused resolveDisabled export, warn on duplicate getKey values

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(dnd): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

