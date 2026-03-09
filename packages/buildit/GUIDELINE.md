# guidelines

Checklist of guidelines for improving design quality, intensity, adaptation, enhancement, and systematization. Each guideline includes a description and recommended combinations with other guidelines for best results.

## harden

Improve interface resilience through better error handling, text overflow handling, and edge case management. Makes interfaces robust and production-ready.

Recommended combinations: `normalize`, `clarify`, `adapt`

BuildIt coverage:

- Button and input overflow constraints (ellipsis / wrap safeguards)
- Mobile touch-target minimums for interactive controls
- Dialog/drawer close and transition behavior guarded for low-motion environments

## normalize

Normalize design to match your design system and ensure consistency

Recommended combinations: `extract`, `polish`, `harden`

BuildIt coverage:

- Shared tokenized spacing, radius, typography, and color theme mixins
- Consistent focus-visible outlines for interactive controls
- Anchor and native button visual parity in `bit-button`

## optimize

Improve interface performance across loading speed, rendering, animations, images, and bundle size. Makes experiences faster and smoother.

Recommended combinations: `distill`, `adapt`, `animate`

BuildIt coverage:

- Reduced-motion fallbacks remove non-essential transitions and keyframe motion
- Variant-level styling done through reusable mixins to avoid duplicated CSS blocks

## polish

Final quality pass before shipping. Fixes alignment, spacing, consistency, and detail issues that separate good from great.

Recommended combinations: `normalize`, `clarify`, `quieter`

BuildIt coverage:

- Refined helper/counter/label text handling for edge-length content
- Improved focus ring consistency and hover/focus affordances

## bolder

Amplify safe or boring designs to make them more visually interesting and stimulating. Increases impact while maintaining usability.

Recommended combinations: `colorize`, `animate`, `delight`

BuildIt coverage:

- Existing variant spectrum (solid/flat/bordered/outline/ghost/frost)
- Optional rainbow/frost effects for high-energy visual modes

## quieter

Tone down overly bold or visually aggressive designs. Reduces intensity while maintaining design quality and impact.

Recommended combinations: `distill`, `normalize`, `polish`

BuildIt coverage:

- Text/ghost variants and tokenized contrast levels support low-intensity UIs

## adapt

Adapt designs to work across different screen sizes, devices, contexts, or platforms. Ensures consistent experience across varied environments.

Recommended combinations: `harden`, `optimize`, `onboard`

BuildIt coverage:

- Small-screen layout constraints for dialog and drawer panels
- Coarse-pointer touch target adjustments for controls
- `dvh`-based overlay sizing to avoid viewport clipping

## clarify

Improve unclear UX copy, error messages, microcopy, labels, and instructions. Makes interfaces easier to understand and use.

Recommended combinations: `harden`, `polish`, `onboard`

BuildIt coverage:

- Input helper/error separation and ARIA wiring for validation messaging
- Accessible control labels for close, clear, loading, and password visibility actions

## distill

Strip designs to their essence by removing unnecessary complexity. Great design is simple, powerful, and clean.

Recommended combinations: `normalize`, `optimize`, `quieter`

BuildIt coverage:

- Shared mixin architecture for size/rounded/color/state behavior
- Avoided one-off per-component overrides where reusable tokens exist

## animate

Review a feature and enhance it with purposeful animations, micro-interactions, and motion effects that improve usability and delight.

Recommended combinations: `delight`, `optimize`, `bolder`

BuildIt coverage:

- Transition and keyframe usage on key interactions with reduced-motion fallback support

## colorize

Add strategic color to features that are too monochromatic or lack visual interest. Makes interfaces more engaging and expressive.

Recommended combinations: `bolder`, `normalize`, `polish`

BuildIt coverage:

- Semantic theme colors mapped through `colorThemeMixin`
- Variant styles use semantic theme roles (base/content/focus/backdrop)

## delight

Add moments of joy, personality, and unexpected touches that make interfaces memorable and enjoyable to use. Elevates functional to delightful.

Recommended combinations: `animate`, `bolder`, `onboard`

BuildIt coverage:

- Optional rainbow effect and frost variant for expressive interactions

## onboard

Design or improve onboarding flows, empty states, and first-time user experiences. Helps users get started successfully and understand value quickly.

Recommended combinations: `clarify`, `adapt`, `distill`

BuildIt coverage:

- Component-level labels, helper text, and error text patterns support guided first use

## extract

Extract and consolidate reusable components, design tokens, and patterns into your design system. Identifies opportunities for systematic reuse and enriches your component library.

Recommended combinations: `normalize`, `distill`, `optimize`

BuildIt coverage:

- Shared token and mixin layer is the default implementation path for new components

## verification scope

The latest pass validated and improved core implementations in:

**Pass 1 — Core primitives (harden / normalize / adapt / optimize)**

- `bit-button`
- `bit-input`
- `bit-dialog`
- `bit-drawer`

**Pass 2 — All remaining components (harden / adapt / optimize)**

Reduced-motion guards added (keyframe animations not yet covered by global token zeroing):

- `bit-toast` — `toast-exit` keyframe + small-screen max-width constraint
- `bit-alert` — `bit-alert-exit` dismiss keyframe
- `bit-select` — `bit-select-spin` loader keyframe
- `bit-combobox` — `bit-combobox-spin` loader keyframe
- `bit-tab-panel` — `tab-panel-in` entry keyframe
- `bit-box` / `rainbow.css` — `rainbow-rotate` infinite keyframe

Coarse-pointer touch targets added (`@media (pointer: coarse)` min 44 px):

- `bit-checkbox` — host min-height
- `bit-radio` — host min-height
- `bit-slider` — thumb expanded + container min-height
- `bit-rating` — star buttons min 44 × 44 px
- `bit-pagination` — page buttons min-height
- `bit-select` — field trigger min-height
- `bit-combobox` — field trigger min-height

Components confirmed covered via `var(--transition-*)` theme tokens (no extra block needed):

- `bit-menu`, `bit-tooltip`, `bit-popover` — all transitions use zeroed tokens
- `bit-switch`, `bit-tabs`, `bit-accordion`, `bit-chip`, `bit-badge` — no keyframe animations

**Pass 3 — Accessibility gaps (normalize / clarify)**

Forced-colors focus ring and visibility fixes (`@media (forced-colors: active)`):

- `bit-select` — added `forcedColorsFocusMixin('.field')` (box-shadow ring replaced by `Highlight` outline in HCM)
- `bit-combobox` — added `forcedColorsFocusMixin('.input')` (native input outline suppression fixed in HCM)
- `bit-tooltip` — added `forcedColorsMixin` (tooltip background gains border for HCM visibility)

**Pass 4 — Full-component audit (normalize / adapt / clarify)**

Forced-colors focus ring gaps filled:

- `bit-input` — added `forcedColorsFocusMixin('input')` (inner `<input>` had `outline: none`; box-shadow on `.field:focus-within` is stripped in HCM — ring now restored on the input element)
- `bit-file-input` — added `forcedColorsFocusMixin('.dropzone')` (dropzone had `outline: none`; box-shadow focus indicator lost in HCM)

Coarse-pointer touch target added:

- `bit-chip` — `.remove-btn` expanded to `min-height / min-width: var(--size-11)` under `@media (pointer: coarse)` (was `1.35em ≈ 19 px`)
- `bit-alert` — `.close` dismiss button expanded to `min-height / min-width: var(--size-11)` under `@media (pointer: coarse)` (was `--size-5` = 20 px)
- `bit-dialog` — `.close` button expanded to `min-height / min-width: var(--size-11)` under `@media (pointer: coarse)` (was `--size-8` = 32 px)
- `bit-drawer` — `.close-btn` expanded to `min-height / min-width: var(--size-11)` under `@media (pointer: coarse)` (was icon-size + `--size-1` padding ≈ 24 px)

Explicit focus-visible style added for consistency (normalize):

- `bit-breadcrumb-item` — `.link:focus-visible` now sets `outline: var(--border-2) solid currentColor` with matching offset, matching the system-wide focus convention (previously relied on browser default)
- `bit-otp-input` — added `forcedColorsFocusMixin('.cell')` (cell box-shadow focus ring replaced by `Highlight` outline)
- `bit-slider` — inline `@media (forced-colors: active)` block: sole-thumb box-shadow-only focus ring replaced by `outline: 2px solid Highlight`
- `bit-textarea` — added `forcedColorsFocusMixin('textarea')` (native `outline: none` suppression fixed in HCM)
- `bit-chip` — added `forcedColorsMixin` (solid chip backgrounds gain border for HCM boundary visibility)

Dynamic error / helper text announced to screen readers (`aria-live`):

- `bit-select` — added `aria-live="polite"` to `.helper-text` div (error/helper messages now announced on change)
- `bit-textarea` — added `aria-live="polite"` to `.helper-text` div (same pattern)
- `bit-input` — already correct: separate `role="alert"` error div + static helper div
- `bit-combobox` — already correct: `aria-live="polite"` on helper-text span (confirmed)
- `bit-number-input` — delegates to `bit-input`, inherits correct `role="alert"` error handling

**Pass 4 — Text-overflow, coarse-pointer, forced-colors (harden / adapt / normalize)**

Text overflow truncation added (harden):

- `bit-accordion-item` `.title` — `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` so long titles are truncated to a single line within the summary row
- `bit-breadcrumb-item` — added `<span class="label">` wrapper around default slot; `.label { max-width: var(--breadcrumb-item-max-width, 20ch); overflow: hidden; text-overflow: ellipsis; white-space: nowrap }` so long crumb labels are capped and truncated

Coarse-pointer touch targets added (adapt):

- `bit-accordion-item` — `summary @media (pointer: coarse) { min-height: var(--size-11) }` (default 38px padding-based height falls short on coarse pointer)
- `bit-tab-item` — `button @media (pointer: coarse) { min-height: var(--size-11) }` (default 26px button height falls short on coarse pointer)

Forced-colors fixes (normalize):

- `bit-drawer` — added `forcedColorsMixin` (panel uses background-only with no border; gains `1px solid ButtonText` border in HCM)
- `bit-rating` — custom `@media (forced-colors: active)` block: unfilled stars use `ButtonText`, filled stars use `forced-color-adjust: none` + `color: Highlight` to preserve the filled/unfilled visual distinction
- `bit-avatar` — inline `@media (forced-colors: active)` block: `.avatar` gains `border: 1px solid ButtonText`; `.status` indicator drops background-only colors and gets a `ButtonText` outline with `Highlight` fill

Confirmed OK (no fix needed):

- `bit-card` — all variants already have explicit `border: var(--_border) solid` CSS; system color override handles HCM visibility
- `bit-dialog` — has `border: var(--border) solid var(--dialog-border-color)` in CSS already
- `bit-popover` — has `border: var(--border) solid var(--color-contrast-200)` in CSS already
- `bit-file-input` — dropzone has `border: var(--border-2) dashed var(--_border-color)` already
- `bit-switch` — always has `min-height: var(--size-11)` in base styles (not guarded by coarse pointer)

**Pass 5 — Text-overflow completeness + forced-colors active states (harden / normalize)**

Text overflow truncation extended (harden):

- `bit-alert` `.heading` — added `overflow: hidden; text-overflow: ellipsis` alongside existing `white-space: nowrap` so programmatic heading text is truncated at one line instead of overflowing the header row
- `bit-badge` `.badge` — added `overflow: hidden; text-overflow: ellipsis; max-width: var(--badge-max-width, 24ch)` alongside existing `white-space: nowrap` so badge labels are capped when unusually long (customizable via CSS variable)

Forced-colors active-state distinction (normalize):

- `bit-tab-item` — imported `forcedColorsFocusMixin('button')` (clears box-shadow-based focus ring in HCM); added inline `@media (forced-colors: active)` block:
  - `button:focus-visible`: `outline: 2px solid Highlight; box-shadow: none` (redundant with mixin but ensures override over theme-color outline)
  - `:host([active]) button`: `outline: 2px solid Highlight; outline-offset: -2px` — the `box-shadow` raised indicator is stripped in HCM; a negative-offset Highlight outline replaces it so the active tab is still visually distinct

Confirmed OK (no fix needed):

- `bit-tabs` `.indicator` — hidden for all variants via CSS; the active tab state is communicated via `aria-selected` on the inner `role="tab"` button; browser applies system color treatment automatically
- `bit-otp-input` cells — default `--_cell-size: var(--size-12)` = 48px; already meets the 44px touch target minimum on coarse pointer
- `bit-file-input` dropzone — default `min-height: var(--size-36)` = 144px; well above coarse pointer threshold
- `bit-number-input` — delegates spin buttons to `bit-button` and field to `bit-input`; both have coarse pointer and forced-colors fixes
- `bit-toast` message body — free-flow multiline text; truncation is inappropriate for body content

**Pass 6 — Menu touch target + label truncation; accordion forced-colors (harden / adapt / normalize)**

Menu item improvements (harden / adapt):

- `bit-menu-item` — added `<span class="item-label">` wrapper around the default slot with `.item-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }` — long menu item labels now truncate rather than widening the panel
- `bit-menu-item` — added `@media (pointer: coarse) { .item { min-height: var(--size-11) } }` — menu items at `padding: var(--size-1-5)` have ~32px click area by default; now guaranteed 44px on touch screens

Accordion item forced-colors (normalize):

- `bit-accordion-item` — added `@media (forced-colors: active) { summary { border-color: ButtonText } }` — the default/solid variant sets `--accordion-item-border-color: transparent`, which stays invisible in Windows High Contrast mode; this override ensures a ButtonText-colored border renders in HCM so each accordion summary is visually distinct from its neighbours

Confirmed OK (no further fixes needed):

- `bit-pagination` — each page button is a `bit-button` element; coarse-pointer and forced-colors are already handled inside the button component
- `bit-accordion-item` `.title` — already has `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` from Pass 4
- `bit-dialog` `.title` — intentionally multiline; long titles should wrap not truncate
- All transition-using components (checkbox, radio, switch, chip, accordion-item, tab-item, menu) — use `var(--transition-*)` tokens exclusively; zeroed globally by `theme.css` under `prefers-reduced-motion`; no explicit guards needed
