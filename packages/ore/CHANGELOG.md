# Change Log - @vielzeug/ore

This log was last generated on Fri, 14 Aug 2026 09:10:58 GMT and should not be manually modified.

## 2.0.4
Fri, 14 Aug 2026 09:10:58 GMT

### Patches

- fix: reuse ElementInternals when a form-associated host reconnects

## 2.0.3
Mon, 10 Aug 2026 21:21:35 GMT

_Version update only_

## 2.0.2
Mon, 10 Aug 2026 15:11:23 GMT

### Patches

- fix test fixture resource retention

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: consolidate runtime APIs at the root; remove subpaths, model(), form-controller policy, onError recovery, and colon bindings; require synchronous setup and explicit unsafeHtml()

### Minor changes

- chore(ore): remove aria() (use bind({ aria }, { target })); live() now returns a per-binding wrapper (no global signal registry); HTMLResult public surface is mount-only; EmitFn is strictly typed (no string escape hatch); FormFieldHandle.setValidity removed (use setCustomValidity/internals); testing install() is now install(afterEach, { formInternals: true }) opt-in; assay moved to optional peer dependency. Also: single Symbol.for branding, namespaced template markers (data-ore-b / <!--ore:N-->), production dev-gate baked into dist build, unified form-control sync path, dev warnings for unknown event modifiers / non-spread in-tag interpolations / null listen targets

## 1.3.0
Sun, 26 Jul 2026 06:43:54 GMT

### Minor changes

- refactor(ore): extract query/event/wait testing primitives into new @vielzeug/assay dependency (waitFor/waitForEvent now throw AssayTimeoutError instead of OreTimeoutError), move OreTimeoutError and debugFlush() to @vielzeug/ore/testing (remove ./devtools entirely), make testing/flush() deterministic via pending-work tracking instead of a fixed microtask-turn guess (FLUSH_DEEP/maxTurns removed), let Fixture extend QueryScope, merge aria attributes into bind()'s HostBindConfig (aria() now delegates through bind()), rename resetIdCounter() to resetStableIdCounter(), fix useSlots() creating a duplicate MutationObserver when called from onMounted(), move each/when/classMap/styleMap/model to the main entry point, and open the custom-directive authoring API (createDirectiveResult/createSpreadObject) from @vielzeug/ore/directives

### Patches

- refactor(ore): derive vite external list from package.json via readWorkspaceDeps() instead of hand-listing dependencies

## 1.2.3
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement
- fix: attach orphaned custom-prop JSDoc to normalizePropDefinition() instead of floating unattached

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

