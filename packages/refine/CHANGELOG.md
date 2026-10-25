# Change Log - @vielzeug/refine

This log was last generated on Sun, 25 Oct 2026 05:13:02 GMT and should not be manually modified.

## 26.10.20
Sun, 25 Oct 2026 05:13:02 GMT

### Minor changes

- ore-button: add opt-in resting elevation; fix keyboard focus ring never painting and being erased while pressed; fix dark-mode neutral halo painting a dark seam on the top edge
- ore-dialog: give mobile footer actions edge padding that matches their sides and adds the home-indicator inset on top
- refine: motion system hardening - every transition/animation timing now token-driven, component-local prefers-reduced-motion blocks replaced by the root motion-mode hatches (data-motion='full' now opts back in everywhere), hover-move affordances guarded behind @media (hover: hover), new --duration-250/350/1200 tokens
- WCAG 2.2 AA: marquee pauses on hover/focus by default, slider slot label mirrors to aria-label, file drop zone and query-bar filter named from visible content, AA-compliant helper-text token, calendar/date-picker outside-day color token, sticky-header scroll-padding, WCAG 2.2 axe tag set with real-browser scans for all 44 components
## 26.10.19
Sat, 24 Oct 2026 19:56:28 GMT

### Minor changes

- Adopt human-interface-guideline contracts: unconditional 44px touch targets, button emphasis roles, expandable text with truncation reveal, tooltip dwell defaults, 11px type floor, surface/target-gap/safe-area tokens, increased-contrast and reduced-transparency paths, token-driven grid, public design-token checker
- Add named animation tokens, three-state motion mode (setMotionMode/getMotionMode), navigation-menu panel cross-fade, and necromancer-powered FLIP datagrid row motion
- Fix reduced-motion bypasses (datagrid/navbar/command-palette spinners, marquee), add FLIP reflow motion to command-palette results and the toast stack via a shared layout-motion helper, and adopt --animate-* tokens in the light-DOM animation utilities
- toast: greenfield exit refactor - pure-CSS @starting-style enter (no JS phase class), exit finalizes on transitionend with the themed --toast-exit-duration measured by the view (no longer clipped by a fixed timer), swipe flight reuses the same duration and motion mode instead of a hardcoded matchMedia check, progress bar honors three-state motion mode, store pause seam collapses to setPaused(boolean)
- toast: status model replaces color/variant - neutral light-dark surface, per-status icons, danger drives urgency
- toast/alert UX pass: row-1 centering (icon/heading/close share one axis), close hit area via pseudo-element instead of 44px layout box, ghost action buttons by default, new --button-min-height hook
- toast: action emphasis (primary/cancel/destructive) reuses ore-button roles; docs reorganized with confirm/cancel and snackbar live examples
- toast: render an ore-avatar in the leading slot via the new avatar option (--toast-avatar-size); alert: --alert-font-size now applies (was shadowed by the size-variant mixin)

### Patches

- calendar: inactive month/year views no longer stack under the day grid (hidden rule class-qualified to outrank the grids' own display declarations)
## 26.10.18
Fri, 23 Oct 2026 14:23:06 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.17
Fri, 23 Oct 2026 07:29:16 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.16
Wed, 21 Oct 2026 07:30:45 GMT

### Minor changes

- feat(refine): ore-tour and ore-spotlight overlay components; fix Back-button visibility, suppress dismiss on programmatic close, render the spotlight dim via a valid single box-shadow (a `none` ring layer invalidated the whole declaration), add a --color-scrim overlay-veil token so the dim stays a darkening veil in dark mode, blur the content behind the translucent tour card, keep the card border and shadow in modal presentation (it blended into the page), show a visible "Step N of M" counter, lead the footer with Skip away from Next, ring the close button on keyboard focus, add a full-bleed media slot for step illustrations with a viewport-capped height, stop the `description` body text from being blanked when the card has any light-DOM child (whitespace assigned to the default slot suppressed the slot fallback), and stop the modal-to-popover presentation flip from stealing focus back to the pre-open element after its exit animation (which stranded arrow-key control outside the card)
- feat(refine): ore-tour gains bind(controller) - one call renders a beacon handle's current snapshot into the card's props and routes next/back/skip/finish/dismiss back into it; auto presentation now freezes per open so a mid-step resize never rebuilds a live card; the card re-asserts focus when a step change rebuilds its content; the spotlight cutout measures element anchors live and follows them on scroll and resize; exports OreTourElement, TourController and TourStepSnapshot for typed host access
- feat(refine): refine responsive speed-reading controls and touch navigation
- feat(refine): add opt-in fullscreen mode to speed-reading
- feat(refine): speech-player picks the most natural voice for its language and gains voice, pitch, and volume controls
- feat(refine): speech-player icon-only toggle, transport on ore-button, speed-up-first rate cycle, single-source speed name (speedNormal/speedSlow/speedFast labels removed), sentence position readout, resume announcement, Media Session, coarse-pointer targets; one tone for the control row while reading (--speech-player-active-color removed, use --speech-player-icon-color)
- fix(refine): card keyboard guard for nested controls, scoped disabled, interactive-only hover, reduced-motion transitions, registered rounded prop, intrinsic flex-wrap horizontal collapse
- fix(refine): rank-item visible track default, AA rank numeral, RTL bar origin, forced-colors bar, capped trailing
- fix(refine): speed-reading two-line narrow toolbar, roomier full-text details, responsive resume control

### Patches

- chat-message: skip no-op textContent writes in slot trim, preventing an infinite slotchange loop on WebKit/iOS Safari
- fix(refine): keep the slider track usable when a long label wraps below it
## 26.10.15
Mon, 19 Oct 2026 10:13:34 GMT

### Major changes

- BREAKING: unify query-bar filtering with a draft Apply/Cancel drawer, optional quick filters, per-key single/multiple selection, and optional registered icons beside drawer option labels. Add content-sized mobile sheets, consistent choice rows, contextual anyLabel, pending-edit protection, search-hidden selection summaries, a toolbar-end slot for application content such as a result count, and a hidden filter entry when no vocabulary exists. Preserve inline applied pills and exact-value removal, count active groups, replace token-array identity with semantic state synchronization, and tag open-change surfaces. commitToken now accepts a token object and selection mode; removeToken removes an exact pair, clearTokens clears a key, and tokenValues replaces tokenValue. Fix nested radio-group keyboard navigation, expose its legend part, and correct drawer handle semantics and canceled swipe restoration. See the Refine migration guide.

### Minor changes

- Render query-bar drawer choices as an icon card gallery when every option of a token carries an icon: responsive 3-up grid, corner checkbox, centered art, name below

### Patches

- Stop ore-card padding="none" (and other --_ custom property ancestors) from leaking into ore-button: the md size tier now declares --_padding, --_height, --_line-height and --_icon-size on the host so inherited values can no longer collapse button padding.
- Query-bar card gallery: unchecked cards drop the corner tick for a clean art-and-name resting state; the checkmark re-appears as the checked card's selection badge (forced-colors mode keeps every tick)
- Badge size=xs uses the size-px vertical padding token instead of a hardcoded 0px
## 26.10.14
Sun, 18 Oct 2026 09:46:30 GMT

### Minor changes

- Add an adaptive coverflow carousel variant with container-fitted previews, accessible selection, and separate navigation areas; use fully rounded carousel navigation buttons. Add ore-speed-reading with stable focal positioning, punctuation-aware pacing, context highlighting, sentence navigation, explicit overflow recovery, responsive icon-only transport, and touch-accessible pace and keyboard help. Keep popovers and tooltips within the viewport when neither side of the trigger fits. Add 1.5× speech playback and consistent numeric speed labels. Preserve select keyboard navigation beneath a stationary pointer.
## 26.10.13
Sat, 17 Oct 2026 06:46:08 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.12
Sat, 17 Oct 2026 05:06:33 GMT

### Patches

- fix: support touch swiping in carousel slides
## 26.10.11
Thu, 15 Oct 2026 13:45:48 GMT

### Major changes

- Replace icon registration arrays with library-neutral definitions; group shared registration and Lucide/Iconify data adapters under icons subpaths, preserving the icon component entry. Make Lucide an optional peer owned by full-set consumers, normalize Iconify provider classes, and reject invalid geometry before transforms. Add pure Heroicons, Tabler, and MDI named-map adapters for caller-supplied individual Iconify data.
## 26.10.10
Thu, 15 Oct 2026 05:00:39 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.9
Wed, 14 Oct 2026 21:26:14 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.8
Tue, 13 Oct 2026 07:49:18 GMT

### Minor changes

- adopt prop.oneOf() for union-valued props, model() for text-field bindings, and the single useField validity signal
## 26.10.7
Mon, 12 Oct 2026 20:24:11 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.6
Mon, 12 Oct 2026 18:44:06 GMT

### Minor changes

- add ore-query-bar: a token search field with removable filter pills and a key/value suggestion dropdown
- ore-navbar-item now emits aria-current="location" for active in-page (#) anchors and "page" only for actual page routes: a section anchor announced as the current page misdescribed the document to screen readers

### Patches

- Fix ore-tabs boot race: ensureSelection no longer locks an empty first value when slotted tab items have not received their bound values yet; it defers until a valued tab exists, so a bound host value is never overridden by the fallback.
- Preserve internal icon registration in production bundles and connect query-bar suggestions across shadow-root boundaries.
## 26.10.5
Thu, 08 Oct 2026 07:48:38 GMT

### Minor changes

- Add a preview slot and active-change event to ore-command-palette
## 26.10.1
Wed, 07 Oct 2026 07:25:55 GMT

### Minor changes

- add ore-rank-list/ore-rank-item: ranked rows where each row is its own proportional-bar visualization
- Render the documented ore-menu-item parts (item, icon-slot, item-label) so consumers can style items through ::part().
- add a header-end action slot to ore-counter

### Patches

- fix(button): keep slotted content when href is set after upgrade
- fix(theme): define --focus-ring outline token consumed by navbar/sidebar/list/drawer focus styles; consolidate dead --color-focus uses onto it
- Standardize package text punctuation
- honor the documented --input-color override on ore-input
- define the select panel radius from --select-radius so a slotted select stops inheriting the surrounding radius
- Snackbar toasts keep one bar height whether or not they carry an action: the message row reserves the action button's height (new --toast-snackbar-height, default --size-8) and centres its text.
## 26.10.0
Fri, 02 Oct 2026 18:01:51 GMT

### Minor changes

- Adapt ore-qr-scanner to sigil 4-state scanner status
- Unify overlay positioning on createDropdownPositioner (popover/tooltip gain RTL, containing-block correction, autoUpdate; menu data-placement now set); extract shared calendar grid keyboard navigation; collapse useDialogControl mount API to mount(); derive check-css-contract mixin emissions from sources; extract datagrid labels; rename layer.css to layers.css
- feat: toast snackbar mode
- Add ore-chat-panel overlay component (transcript, suggestions, message actions, composer, Escape/focus handling) with docs and tests; add eventFieldValue/eventFieldChecked helpers and theme controller; raise message-composer counter contrast to WCAG AA
- Add ore-cookie-banner consent component
- ore-icon no longer bundles the full Lucide set: names resolve from a registry holding only refine's own component icons. Apps register their icons via registerIcons() or import '@vielzeug/refine/icon-lucide' for the complete library.
- add ore-speech-player, a text-to-speech control over the Web Speech API
- feat(refine): speech player sentence progress, speed control, resume position, and error state

### Patches

- set box-sizing on the inner input so select triggers and search fields keep equal heights inside shadow roots
- Load testing fixtures in IIFE dependency order (Sentinel after Arsenal, Focus after Keymap) so bundles no longer capture undefined globals; hoist parseOptionalBool to core and the container-measure helpers to a private layout module; narrow useFloatingTrigger offset/slot to single callables
- Composite component sub-paths now register their child components: the per-entry library build silently dropped side-effect-only imports between entry modules, so importing e.g. @vielzeug/refine/cookie-banner shipped without registering ore-button/ore-checkbox. Children are TAG re-exports now (bindings survive cross-entry chunking), guarded by check:cross-entry in build
## 3.3.1
Wed, 23 Sep 2026 03:47:55 GMT

### Patches

- fix: size dropdown panels from natural width and add embedded alert surface for toasts

## 3.3.0
Mon, 21 Sep 2026 15:19:01 GMT

### Minor changes

- Add ore-qr-code and ore-qr-scanner components backed by @vielzeug/sigil
- feat(refine): add ore-counter tally control with quick-steps, chip layout=stacked and ore-progress segments

### Patches

- fix(refine): honor documented --button-padding, --button-gap and --button-font-size overrides

## 3.2.1
Wed, 16 Sep 2026 09:18:24 GMT

### Patches

- Fix checkbox, radio and switch labels wrapping below the control instead of beside it, and stepper labels overlapping on narrow widths.

## 3.2.0
Sun, 13 Sep 2026 20:22:23 GMT

### Minor changes

- Add explicit sidebar item labels and menu panel foreground theming, and fix controlled popover dismissal through triggers, outside clicks, and Escape.

## 3.1.0
Fri, 11 Sep 2026 11:19:30 GMT

### Minor changes

- Use native anchor semantics for link buttons, improve dark field-label contrast, make skeleton media fill externally sized hosts, normalize native sidebar item controls, remove empty navbar regions from layout, apply perceptually distinct elevation to frost navbars, and support contextual mobile menu icons.

## 3.0.0
Wed, 09 Sep 2026 22:15:14 GMT

### Breaking changes

- Remove the glass surface variant, align DataGrid sources with Sourcerer's page-source contract, publish complete framework typings, and harden interaction lifecycles

## 2.4.0
Sun, 06 Sep 2026 04:50:16 GMT

### Minor changes

- feat: add stats and improve accessible, responsive component interactions

## 2.3.1
Sun, 30 Aug 2026 13:16:08 GMT

_Version update only_

## 2.3.0
Fri, 28 Aug 2026 07:44:01 GMT

### Minor changes

- Harden internal announcer: accept ownerDocument via AnnounceOptions.document for correct iframe accessibility tree routing. Fix documentation to describe latest-value replacement (debounce) instead of queueing. Remove unsubstantiated 50ms delay claim. All call sites (carousel, typing-indicator, chat-message, command-palette, file-input, file-input-upload, alert) now pass getHost().ownerDocument.

## 2.2.5
Wed, 26 Aug 2026 17:29:55 GMT

_Version update only_

## 2.2.4
Fri, 21 Aug 2026 16:02:58 GMT

### Patches

- fix: resolve TypeScript type errors in test files
- refactor: extract focus and swipe primitives into dedicated packages
- feat: initial release
- fix: navbar stuck in mobile mode after resizing back to desktop: untrack breakpoint watch callback to prevent mediaMatches from becoming a dependency that triggers effect re-run and disposes the MediaQueryList listener

## 2.2.3
Thu, 20 Aug 2026 10:12:48 GMT

### Patches

- fix: registerProp reads existing PropMeta signal on reconnect instead of host property overwritten by defineFieldValue; restores ore-number-input value on cart/checkout

## 2.2.2
Wed, 19 Aug 2026 09:25:42 GMT

_Version update only_

## 2.2.1
Wed, 19 Aug 2026 06:57:36 GMT

_Version update only_

## 2.2.0
Tue, 18 Aug 2026 11:28:52 GMT

### Minor changes

- feat(refine): add fouc.css export for FOUC suppression of unupgraded custom elements

## 2.1.6
Mon, 17 Aug 2026 10:42:29 GMT

_Version update only_

## 2.1.5
Sun, 16 Aug 2026 10:35:40 GMT

_Version update only_

## 2.1.4
Sun, 16 Aug 2026 09:15:40 GMT

_Version update only_

## 2.1.3
Sat, 15 Aug 2026 10:39:54 GMT

_Version update only_

## 2.1.2
Sat, 15 Aug 2026 06:26:02 GMT

### Patches

- fix: update 29 ripple imports from /watch subpath to root after ripple 3.0 subpath collapse

## 2.1.1
Fri, 14 Aug 2026 09:10:58 GMT

_Version update only_

## 2.1.0
Thu, 13 Aug 2026 06:06:28 GMT

### Minor changes

- feat: add navigation menu

## 2.0.3
Mon, 10 Aug 2026 21:21:35 GMT

### Patches

- refactor: collapse core/ barrels, unify composable disposal, derive manifest from filesystem, add --_* CSS contract check

## 2.0.2
Mon, 10 Aug 2026 15:11:23 GMT

### Patches

- Fix floating overlays in deferred slot and preview lifecycles

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- add classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: migrate component observers to Ripple watch module

### Minor changes

- fix: fix broken stepper/avatar-group subpath exports, move ore-step/ore-stepper to context-based coordination, remove duplicate toast-like message feature from ore-stepper
- refactor: simplify public component boundaries and native form behavior

### Patches

- fix: ore-slider no longer forces width:100% by default, breaking layout next to other fields in a flex/grid row; add fullwidth opt-in matching ore-input/ore-select/ore-number-input convention
- chore: replace removed aria() with bind({ aria }, { target }); opt into form-internals polyfill via install(afterEach, { formInternals: true }); narrow headless option-list close reasons to DropdownCloseReason (latent type bug exposed by ore's strict EmitFn)
- fix: refine slider touch geometry

## 1.8.0
Sun, 26 Jul 2026 06:43:54 GMT

### Minor changes

- refactor(refine): adopt @vielzeug/assay in @vielzeug/refine/testing: queryInShadow/queryAllInShadow/queryPart/getSlotted/nextTick/wait are now re-exported from assay instead of duplicated (same names, same behavior). dispatchPointer() is removed: use fire.pointer* from @vielzeug/ore/testing (which re-exports assay's dispatchers) instead. The unused keyEvent() helper is also removed: use fire.keyDown/fire.keyboard, which construct and dispatch in one call. Also updates to @vielzeug/ore's renamed resetStableIdCounter() and testing/flush()'s removed FLUSH_DEEP option

### Patches

- fix(refine): derive vite external list from package.json via readWorkspaceDeps() instead of hand-listing dependencies: fixes @vielzeug/keymap missing from the tree-shakeable build's externals (was being silently inlined into refine's own dist instead of staying external) and removes a dead @vielzeug/scroll entry from the bundle config (never imported, not a dependency)

## 1.7.0
Fri, 24 Jul 2026 21:50:49 GMT

### Minor changes

- feat(file-input): drag feedback, upload progress/retry/replace, independent per-file queue
- refactor(file-input): extract upload lifecycle into file-input-upload.ts, fix disabled guards on remove/retry/replace, make drop-zone disabled reactive, add screen-reader announcements, gate Replace to multiple mode
- feat(refine): add loading/success states to ore-input, fix disabled-state opacity anti-pattern across ore-input/ore-textarea/ore-file-input
- feat(refine): add loading/success states to ore-textarea/ore-select/ore-combobox/ore-number-input, fix disabled-state opacity anti-pattern on ore-textarea/ore-number-input hosts, fix ore-select loading forward disabling its trigger
- feat(refine): add success state to ore-date-picker/ore-time-picker/ore-message-composer, add error/success status icon to ore-file-input dropzone, fix ore-message-composer loading state blocking text entry
- feat(refine): add List component with swipe-to-reveal row actions and swipe-through confirm gesture

## 1.6.0
Fri, 24 Jul 2026 05:28:41 GMT

### Minor changes

- chore: fix --_* CSS mixin gaps (select/combobox/date-picker/time-picker/checkbox/switch/menu), RTL keyboard nav, cross-shadow-root ARIA (tab-item/tab-panel), icon.ts XSS-warning noise; dedup headless dirty-tracking; dispose-shape consistency; BREAKING: remove unused createFocusTrap/createDialogFocusControl from @vielzeug/refine/headless

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.5.4
Tue, 21 Jul 2026 07:04:16 GMT

_Version update only_

## 1.5.3
Fri, 17 Jul 2026 14:17:07 GMT

### Patches

- fix: resolve @vielzeug/ore/directives in vitest

## 1.5.2
Thu, 16 Jul 2026 16:49:59 GMT

### Patches

- fix: match externalized subpath imports (e.g. @vielzeug/ore/forms) so refine doesn't vendor a second, disconnected copy of ore's runtime

## 1.5.1
Thu, 16 Jul 2026 13:17:33 GMT

### Patches

- fix: ore-navbar's mobile toggle button and menu panel now respect their own hidden state: :host([data-mobile]) .mobile-toggle set display:inline-flex unconditionally (an author-stylesheet rule, which always wins over the UA stylesheet's [hidden]{display:none} regardless of specificity), so the button stayed visibly clickable even when the component's own logic correctly decided to hide it (no mobile-menu slot content, no mobile-sidebar target): clicking toggled a panel that stayed hidden too, doing nothing visible. Also: ore-navbar-item now closes the mobile menu on click (via a new closeMobileMenu on NavbarContext): previously stayed open after navigating

## 1.5.0
Wed, 15 Jul 2026 17:08:06 GMT

### Minor changes

- feat: ore-input, ore-number-input, ore-combobox, and ore-date-picker now set a 12rem min-width on their :host (matching ore-select/ore-textarea's existing convention, each via its own --<field>-min-width custom property), and ore-number-input's inner ore-input now stretches (flex:1) to fill its own host's width instead of just its min-width: form fields of different types placed side by side (e.g. in a 2-column grid) no longer render at visibly different widths purely because their content differs

### Patches

- fix: ore-select's and ore-date-picker's inner ore-input trigger now stretches (width:100%) to fill the host's own width: :host is display:inline-block on both, which unlike a flex/grid container with stretch alignment never stretches its children on its own, so the trigger stayed shrink-wrapped to its own 12rem minimum even when the host itself had already been stretched wider by an ancestor grid/flex track, rendering visibly narrower than a same-width sibling field (e.g. ore-number-input, whose inner field already stretches via flex:1)
- fix: ore-toast now registers ore-alert internally: toast.ts renders <ore-alert> in its own template but never imported alert.ts, so any consumer that imported only @vielzeug/refine/toast (without separately importing @vielzeug/refine/alert) got an undefined custom element rendering as unstyled plain text instead of a styled alert

## 1.4.2
Wed, 15 Jul 2026 07:45:31 GMT

### Patches

- fix: render ore-number-input's stepper buttons inside the field's bordered box instead of floating beside it
- fix: ore-number-input default width now stretches to fill its container like other fields instead of shrink-wrapping; ore-date-picker's calendar now positions via fixed+auto-correction so it never grows/shifts an ancestor's layout
- fix: dropdown-style overlays (select, combobox, menu, date-picker) now auto-detect the nearest clipping ancestor as their flip/shift boundary (via orbit's getClippingAncestorRect) instead of only the page viewport, fixing ore-date-picker's calendar overhanging a dialog. Also self-corrects any residual position:fixed containing-block mismatch by measuring the actual rendered rect and compensating: analytically pre-detecting the trapping ancestor turned out to misposition ore-select's dropdown, which isn't affected by the same ancestor the calendar is. The measurement neutralizes the floating element's own entrance-transition transform first, so it isn't misread as a permanent mismatch and baked into the position, that misread was making ore-select's options unclickable (dropdown appeared correctly placed but closed immediately on option click)
- fix: ore-dialog/ore-drawer no longer mistake a same-named bubbling event from a nested field for their own native close/cancel: selecting an option in an ore-select/ore-combobox dropdown nested in a dialog was closing the whole dialog instead of just that field's dropdown, because slot-assignment-based event-path computation crosses into a projecting shadow tree regardless of the originating event's own composed flag

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

- feat(command-palette): add ore-command-palette + ore-command-palette-item: searchable, keyboard-driven command list built on refine headless primitives (native <dialog>, createListControl) and @vielzeug/keymap for the global open shortcut

### Patches

- chore(internal): migrate component setup() functions and shared form-context/checkable-binding helpers off ore's removed SetupContextBag onto the new free-function API (bind/emit/onMounted/.../useEmit/useSlots/getHost); no consumer-facing API change.
- fix: externalize @vielzeug/ore/directives, /forms, /observers (mapped to the same Ore global) in the IIFE bundle: previously only the bare @vielzeug/ore specifier was externalized, so Rollup silently inlined a second copy of ore's module graph into refine.iife.js, and any lifecycle hook (getHost, onMounted, etc.) resolved through it always threw 'outside setup'. Fixes broken docs component previews for every component using useField/when/live/raw/styleMap/resizeObserver/intersectionObserver.

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

