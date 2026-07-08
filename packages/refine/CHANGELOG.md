# Change Log - @vielzeug/refine

This log was last generated on Wed, 08 Jul 2026 17:19:00 GMT and should not be manually modified.

## 1.3.0
Wed, 08 Jul 2026 17:19:00 GMT

### Minor changes

- feat: add ore-chat-message and ore-typing-indicator components; add a gallery/preview-grid mode to ore-file-input for image thumbnails

### Patches

- fix: chat-message alignment/announce fixes, typing-indicator reliable announcement via shared live region, command-palette simplified slot handling + disabled-row Enter guard, file-input naming cleanup

## 1.2.0
Wed, 08 Jul 2026 09:22:31 GMT

### Minor changes

- feat(command-palette): add ore-command-palette + ore-command-palette-item — searchable, keyboard-driven command list built on refine headless primitives (native <dialog>, createListControl) and @vielzeug/keymap for the global open shortcut

### Patches

- chore(internal): migrate component setup() functions and shared form-context/checkable-binding helpers off ore's removed SetupContextBag onto the new free-function API (bind/emit/onMounted/.../useEmit/useSlots/getHost); no consumer-facing API change.
- fix: externalize @vielzeug/ore/directives, /forms, /observers (mapped to the same Ore global) in the IIFE bundle — previously only the bare @vielzeug/ore specifier was externalized, so Rollup silently inlined a second copy of ore's module graph into refine.iife.js, and any lifecycle hook (getHost, onMounted, etc.) resolved through it always threw 'outside setup'. Fixes broken docs component previews for every component using useField/when/live/raw/styleMap/resizeObserver/intersectionObserver.

## 1.1.3
Tue, 07 Jul 2026 09:20:39 GMT

_Version update only_

## 1.1.2
Sun, 05 Jul 2026 21:33:33 GMT

_Version update only_

## 1.1.1
Sun, 05 Jul 2026 06:22:27 GMT

_Version update only_

## 1.1.0
Sun, 05 Jul 2026 05:52:18 GMT

### Minor changes

- chore(refine): improve refine headless module: fix dead labelPlacement option, use RefineConfigError in createOptionList, consolidate visually-hidden CSS, unify disabled option convention across headless primitives to Readable signals, split SwipeControl onCancel/onRelease, add selection-control/spinner test coverage
- feat(refine): fix ore-button link mode to render a real anchor, rework ore-number-input composition onto ore-input's ref API, add form association to ore-otp-input, add ARIA grid row structure + arrow-key nav to calendar/date-picker month/year views, add error/helper props to rating/slider, route datagrid renderExpanded through raw() and fix calendar event-color CSS injection, rename datagrid JS properties to camelCase

### Patches

- fix(refine): surface visible failure state in ore-copy-command instead of silently failing

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(refine): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

