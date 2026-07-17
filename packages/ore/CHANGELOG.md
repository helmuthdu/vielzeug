# Change Log - @vielzeug/ore

This log was last generated on Fri, 17 Jul 2026 14:17:07 GMT and should not be manually modified.

## 1.2.2
Fri, 17 Jul 2026 14:17:07 GMT

### Patches

- fix(ore): guard against silent template/test-utility failure states

## 1.2.1
Tue, 14 Jul 2026 06:12:09 GMT

### Patches

- fix: rewrite workspace:* deps to real semver on publish (was shipping literal 'workspace:*' to npm, breaking installs outside this monorepo)

## 1.2.0
Sat, 11 Jul 2026 19:22:05 GMT

### Minor changes

- feat: useEmit()'s emit() now returns dispatchEvent()'s boolean result (false when a listener calls preventDefault()), instead of void; add onFormReset() lifecycle hook and useField() validity/validationMessage/onReset options wired to ElementInternals.setValidity() for native constraint-validation support in form-associated components
- feat(testing): @vielzeug/ore/testing gains installFormInternalsPolyfill()/walkFlatTree() -- ElementInternals/FormData/form.reset() jsdom polyfills for form-associated components, wired automatically into install()

## 1.1.0
Wed, 08 Jul 2026 09:22:31 GMT

### Minor changes

- chore: remove SetupContextBag — setup(props) takes only props; lifecycle hooks (onMounted/onCleanup/onEvent/onElement/watchEffect), host bindings (bind/aria), context (inject/injectStrict/provide), and per-instance factories (useEmit/useSlots/getHost) are now free functions imported from @vielzeug/ore. Form helpers (useField/createFormContext) moved to @vielzeug/ore/forms. define()/ComponentDefinition dropped the Emits/SlotNames generics in favor of useEmit<Emits>()/useSlots<SlotNames>().
- refactor: consolidate lifecycle-guard errors, dedupe bind()/aria() attribute writing, remove each() dev-time keyFn probe, add axeCheck test helper, and harden internal invariants (compiled-template lookups, anchor parentNode) via a new OreInternalError. BREAKING: html`` now throws OreApiError immediately for an invalid dynamic tag name in every build (previously warned and skipped only the one slot) — matches each()'s duplicate-key guard, which already always throws.

### Patches

- fix: add an IIFE-only aggregate entry (src/iife.ts) merging directives/forms/observers onto window.Ore — without it, downstream IIFE consumers that don't externalize every ore sub-path inline a second, disconnected copy of ore's runtime state

## 1.0.5
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.0.4
Sun, 05 Jul 2026 21:33:33 GMT

### Patches

- fix(ore): parse string prop values assigned via pre-upgrade or post-upgrade property paths

## 1.0.3
Sun, 05 Jul 2026 06:22:27 GMT

_Version update only_

## 1.0.2
Sun, 05 Jul 2026 05:52:18 GMT

### Patches

- fix(ore): fix XSS gaps in setAttr, matchMedia test env, dead code cleanup, test coverage, and docs accuracy

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(ore): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

