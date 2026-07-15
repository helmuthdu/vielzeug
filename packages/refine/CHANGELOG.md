# Change Log - @vielzeug/refine

This log was last generated on Wed, 15 Jul 2026 07:45:31 GMT and should not be manually modified.

## 1.4.2
Wed, 15 Jul 2026 07:45:31 GMT

### Patches

- fix: render ore-number-input's stepper buttons inside the field's bordered box instead of floating beside it
- fix: ore-number-input default width now stretches to fill its container like other fields instead of shrink-wrapping; ore-date-picker's calendar now positions via fixed+auto-correction so it never grows/shifts an ancestor's layout
- fix: dropdown-style overlays (select, combobox, menu, date-picker) now auto-detect the nearest clipping ancestor as their flip/shift boundary (via orbit's getClippingAncestorRect) instead of only the page viewport, fixing ore-date-picker's calendar overhanging a dialog. Also self-corrects any residual position:fixed containing-block mismatch by measuring the actual rendered rect and compensating — analytically pre-detecting the trapping ancestor turned out to misposition ore-select's dropdown, which isn't affected by the same ancestor the calendar is. The measurement neutralizes the floating element's own entrance-transition transform first, so it isn't misread as a permanent mismatch and baked into the position — that misread was making ore-select's options unclickable (dropdown appeared correctly placed but closed immediately on option click)
- fix: ore-dialog/ore-drawer no longer mistake a same-named bubbling event from a nested field for their own native close/cancel — selecting an option in an ore-select/ore-combobox dropdown nested in a dialog was closing the whole dialog instead of just that field's dropdown, because slot-assignment-based event-path computation crosses into a projecting shadow tree regardless of the originating event's own composed flag

## 1.4.1
Tue, 14 Jul 2026 06:12:09 GMT

### Patches

- fix: normalize navbar item button base styles
- fix: rewrite workspace:* deps to real semver on publish (was shipping literal 'workspace:*' to npm, breaking installs outside this monorepo)

## 1.4.0
Sat, 11 Jul 2026 19:22:05 GMT

### Minor changes

- feat: add ore-message-composer -- an auto-resizing chat/comment composer built directly on ore-textarea's headless primitives (createTextField, createAutoResize), with send-shortcut handling, IME-safe composition, and clear-and-refocus on send
- feat: required now participates in real constraint validation (checkValidity/reportValidity/<ore-form> submit blocking) for ore-select, ore-radio-group, ore-checkbox-group, ore-combobox, and ore-checkbox, matching ore-input/ore-textarea; readonly fields are correctly exempt from required validation across the text-field family

### Patches

- fix: ore-message-composer -- flat/ghost variants no longer render identically at rest (flat now matches ore-textarea's filled/inset-shadow recipe), field no longer collapses to near-zero height before the first keystroke (auto-resize scrollHeight read deferred a frame, with a min-height floor as a backstop), and a cancelled send (preventDefault()) no longer refocuses the field

## 1.3.1
Thu, 09 Jul 2026 15:05:53 GMT

### Patches

- fix: light-dark() shadow tokens computed to none in spec-compliant browsers, breaking hover/focus/halo effects across every component; fix button effect/frost mixin selectors matching a nonexistent <button> tag; move refine's internal build scripts into scripts/

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

