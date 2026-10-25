---
title: 'Refine: Accessibility'
description: WCAG compliance, keyboard support, testing strategy, and per-component coverage for Refine.
---

# Accessibility

[[toc]]

Refine targets **WCAG 2.2 AA** compliance across the component library. ARIA roles and states are managed automatically. Keyboard navigation, focus management, and live-region announcements are built into each component.

## What You're Responsible For

Most accessibility is handled for you. Two things require action on your side:

- **Icon-only buttons** must have a `label` attribute: it becomes `aria-label`. Without it, screen readers have nothing to announce.
- **Decorative icons** should have `aria-hidden="true"` so screen readers skip them. Meaningful standalone icons need an `aria-label`.

```html
<!-- Icon-only button: label required -->
<ore-button icon-only label="Delete item" color="error">
  <ore-icon name="trash-2" size="18"></ore-icon>
</ore-button>

<!-- Decorative icon: hidden from screen readers -->
<ore-icon name="check" size="16" aria-hidden="true"></ore-icon>

<!-- Meaningful standalone icon -->
<ore-icon name="warning" size="16" aria-label="Warning"></ore-icon>
```

You can also connect an input to external help text using `aria-describedby`:

```html
<ore-input label="Password" aria-describedby="pwd-hint" />
<p id="pwd-hint">Minimum 8 characters, one uppercase, one number.</p>
```

## Testing Strategy

Refine uses a three-layer approach.

**1: Unit tests (jsdom + Ore test helpers)**

Every component has tests verifying correct `role` and `aria-*` attributes at render time, ARIA state changes on attribute mutation, keyboard event handling, focus management for overlays, and live-region announcements.

**2: Axe-core automated audit (jsdom)**

The `axeCheck` helper is available globally in all Refine unit tests:

```ts
import { mount } from '@vielzeug/ore/testing';

it('has no axe violations', async () => {
  const fixture = await mount('ore-button', { attrs: { color: 'primary' } });
  const results = await axeCheck(fixture.element);
  expect(results.violations).toHaveLength(0);
});
```

The jsdom scan runs the full WCAG 2.2 AA tag set (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) plus `best-practice`. Rules that need a real layout engine (`color-contrast`, `target-size`) or document-level CSS (`css-orientation-lock`) are disabled there and covered by the browser scan instead.

**3: Axe-core in a real browser (Playwright)**

Every component also ships a co-located `*.e2e.ts` accessibility suite that runs axe in Chromium against a mounted component — all 44 component suites, so `color-contrast`, `target-size` (SC 2.5.8), and layout-dependent rules are verified with a real engine, including interaction states (open dialogs, expanded pickers, filled inputs). The shared `axeCheck(page)` helper in `@vielzeug/refine/testing` carries the same WCAG 2.2 AA tag set with page-level rules scoped out, so the rule configuration lives in exactly one place.

**4: Manual checklist (per release)**

Before each minor release:

- [ ] Focus order is logical and follows visual layout
- [ ] All interactive controls have visible focus rings
- [ ] No unintentional keyboard traps (dialogs and drawers are intentional)
- [ ] Dynamic changes (toasts, alerts, async states) are announced
- [ ] Images and icons have appropriate `alt` or `aria-hidden`
- [ ] Form labels are connected to their controls
- [ ] Error states are communicated in text, not color alone
- [ ] Keyboard focus never lands off-screen behind sticky headers (scroll-padding, SC 2.4.11)

## Per-Component Coverage

### Inputs

| Component         | Role                      | Keyboard                          | Key ARIA attrs                                                        |
| ----------------- | ------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| `ore-button`       | `button` (implicit)       | Enter / Space                     | `aria-disabled`, `aria-busy`                                          |
| `ore-input`        | `textbox` (native)        | Standard                          | `aria-describedby`, `aria-invalid`, `aria-required`                   |
| `ore-textarea`     | `textbox` (native)        | Standard                          | `aria-describedby`, `aria-invalid`, `aria-required`                   |
| `ore-select`       | `combobox`                | Arrow / Enter / Escape            | `aria-expanded`, `aria-activedescendant`                              |
| `ore-combobox`     | `combobox`                | Arrow / Enter / Escape            | `aria-expanded`, `aria-activedescendant`                              |
| `ore-checkbox`     | `checkbox` (native)       | Space                             | `aria-checked`, `aria-required`                                       |
| `ore-radio`        | `radio` (native)          | Arrow keys (group nav)            | `aria-checked`                                                        |
| `ore-switch`       | `switch`                  | Space                             | `aria-checked`                                                        |
| `ore-slider`       | `slider`                  | Arrow keys                        | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext`   |
| `ore-rating`       | `radiogroup` + `radio`    | Arrow keys                        | `aria-label` per star                                                 |
| `ore-counter`      | `group` + `spinbutton`    | Arrow keys, Home/End, Page Up/Down | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-live`        |
| `ore-number-input` | `spinbutton`              | Arrow keys                        | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`                     |
| `ore-otp-input`    | `group` of text inputs    | Arrow / Backspace / Tab           | `aria-label` per cell                                                 |
| `ore-file-input`   | `button`-triggered native | Standard                          | `aria-label`                                                          |

### Feedback

| Component           | Role               | Keyboard          | Key ARIA attrs                            |
| ------------------- | ------------------ | ----------------- | ----------------------------------------- |
| `ore-alert`          | `alert` / `status` | Dismiss button    | `aria-live` via region                    |
| `ore-toast`          | `alert` / `status` | Dismiss button    | `aria-live="polite"` or `"assertive"`     |
| `ore-async`          | Dynamic            | N/A | `aria-busy`, `aria-live`, `role="alert"` in error |
| `ore-progress`       | `progressbar`      | N/A | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` |
| `ore-skeleton`       | None (decorative)  | N/A | `aria-hidden="true"` on bones             |
| `ore-typing-indicator` | `status` (on a visually-hidden label) | N/A | `aria-live="polite"`; dots are `aria-hidden="true"` |
| `ore-badge`          | None               | N/A | `aria-label` if meaningful                |
| `ore-chip`           | `button` (interactive) | Enter         | `aria-pressed`, `aria-label`              |

### Disclosure

| Component      | Role                           | Keyboard              | Key ARIA attrs                                      |
| -------------- | ------------------------------ | --------------------- | --------------------------------------------------- |
| `ore-accordion` | `button` + region              | Enter / Space         | `aria-expanded`, `aria-controls`                    |
| `ore-tabs`      | `tablist` + `tab` + `tabpanel` | Arrow keys            | `aria-selected`, `aria-controls`, `aria-labelledby` |

### Overlay

| Component    | Role              | Keyboard                   | Key ARIA attrs                    | Notes                   |
| ------------ | ----------------- | -------------------------- | --------------------------------- | ----------------------- |
| `ore-command-palette` | `dialog` + `combobox` + `listbox` | Arrow / Enter / Escape, focus trap | `aria-modal`, `aria-activedescendant`, `aria-expanded` | Focus restored on close; global shortcut via keymap |
| `ore-dialog`  | `dialog`          | Escape, focus trap         | `aria-modal`, `aria-labelledby`   | Focus restored on close |
| `ore-drawer`  | `dialog`          | Escape, focus trap         | `aria-modal`, `aria-labelledby`   | Focus restored on close |
| `ore-popover` | `dialog` / `menu` | Escape                     | `aria-expanded`, `aria-haspopup`  |                         |
| `ore-menu`    | `menu` + `menuitem` | Arrow / Enter / Escape   | `aria-orientation`                |                         |
| `ore-tooltip` | `tooltip`         | Escape                     | `aria-describedby` on trigger     |                         |
| `ore-tour`    | `dialog`          | Escape, ArrowLeft / ArrowRight | `aria-modal` (dialog modes), `aria-valuetext` on progress | Popover mode: focus on open, restored on close; dialog modes: native focus trap + background lock |
| `ore-spotlight` | decorative      | N/A                        | `aria-hidden` on overlay          | Never captures pointer events |

### Content

| Component       | Role                      | Keyboard      | Key ARIA attrs               |
| --------------- | ------------------------- | ------------- | ---------------------------- |
| `ore-card`       | `button` (interactive)    | Enter / Space | `aria-disabled`, `aria-busy` |
| `ore-stats` | `article`                 | N/A | `aria-disabled`, `aria-busy` |
| `ore-chat-message` | `article` (on the bubble) | N/A | `aria-label` describing sender; failed sends also announced via an assertive live region |
| `ore-list`       | `list` or `listbox` (`selectable`) | Arrow / Home / End / Enter / Space (`selectable` only) | `aria-disabled`; needs `aria-label`/`aria-labelledby` in listbox mode | Manual activation: arrow keys move focus, Enter/Space commits selection |
| `ore-stepper`    | `navigation` + `list`     | Arrow / Home / End (when `clickable`) | `aria-current="step"`, `aria-disabled` | Roving `tabindex` over navigable steps; message region uses `role="status"` + `aria-live="polite"` |
| `ore-list-item`  | `listitem` or `option` (`selectable`) | Enter / Space (activation); Tab reaches slotted `actions-left`/`actions-right` content | `aria-selected`, `aria-disabled` | Swipe-revealed action panels stay reachable via `:focus-within`, independent of the gesture |
| `ore-table`      | `table` (native)          | Standard      | `aria-label`, `aria-busy`    |
| `ore-text`       | heading (`as="h1"`–`h6`) or `button` (`expandable`) | Enter / Space (`expandable`) | `role="heading"` + `aria-level`; `role="button"` + `aria-expanded` when `expandable` | Clipped text mirrors its full content into `title` while truncated |
| `ore-pagination` | `navigation`              | Standard      | `aria-label`, `aria-current` |
| `ore-breadcrumb` | `navigation`              | Standard      | `aria-label`, `aria-current` |
| `ore-avatar`     | None                      | N/A | `alt` or `aria-label`        |

### Layout

| Component    | Notes                                                          |
| ------------ | -------------------------------------------------------------- |
| `ore-sidebar` | Navigation landmark: provide `aria-label` for screen readers  |
| `ore-navbar`  | Navigation landmark: provide `aria-label` for screen readers  |
| `ore-grid`    | Layout only, no interactive semantics                          |
| `ore-box`     | Layout only, no interactive semantics                          |

## Built-in Guarantees

- **Touch targets are 44×44 on every pointer.** Interactive components set a 44px minimum target unconditionally, not only under a coarse pointer: a mouse user gets the same hit area as a touch user. Under a coarse pointer the whole component also promotes one size tier, so padding and icons grow with the target.
- **Truncated text is recoverable.** Any label clipped by an ellipsis (`ore-text`, `ore-list-item`, `ore-menu-item`, `ore-sidebar-item`) mirrors its full text into a `title` while it is actually clipped, and drops it as soon as there is room. `ore-text` additionally supports `expandable` for a tap-to-reveal disclosure.
- **Focus rings share one primitive.** Every keyboard focus indicator composes `--focus-ring`, so the increased-contrast path (`prefers-contrast: more` or `html.contrast-more`) thickens all rings at once by re-declaring one token.
- **Reduced motion and reduced transparency are honored.** `prefers-reduced-motion` zeroes every duration token; an app can force either direction with `setMotionMode('reduced' | 'full')` (see [Theming → Motion Mode](/refine/theming#motion-mode)). `prefers-reduced-transparency` swaps translucent frost fills for opaque ones.
- **Continuously moving content pauses by default.** `ore-marquee` stops on hover and on keyboard focus (`pause-on-hover` defaults to `true`), giving pointer and keyboard users a pause for the repeating ticker (SC 2.2.2) on top of the reduced-motion stop.
- **Keyboard focus is never hidden behind sticky chrome.** Sticky `ore-table` / `ore-datagrid` headers set `scroll-padding-block-start`, so a focused row scrolls into clear view below the pinned header rather than underneath it (SC 2.4.11).
- **Accessible names contain their visible labels.** Controls are named from their own visible text wherever a name can be derived that way — a slider mirrors its default-slot label onto the host `aria-label`, a file drop zone and the query-bar filter button are labelled by their visible content — so a speech-recognition user can activate them by what they read (SC 2.5.3). No `aria-label` overrides a visible label.
- **Helper and tertiary text uses AA tokens.** Form helper text, drop-zone hints, and out-of-month day numbers use the plain `--color-contrast-500` ink (≥ 4.5:1 on canvas) rather than a lightened `color-mix()`, which dropped below the contrast floor (SC 1.4.3).
- **Input helpers carry autofill hints.** `ore-input` forwards `autocomplete`, `ore-otp-input` sets `one-time-code`, and the search-style fields (`ore-combobox`, `ore-query-bar`, `ore-command-palette`) set `autocomplete="off"` with `aria-autocomplete="list"` so their listbox behaviour isn't fought by the browser's own autofill (SC 1.3.5).

## Compliance Contract

Every published component must satisfy:

| Requirement                                        | Standard                            |
| -------------------------------------------------- | ----------------------------------- |
| Keyboard navigability                              | WCAG 2.2 AA §2.1                    |
| Visible focus indicator                            | WCAG 2.2 AA §2.4.7                  |
| Focus not obscured by sticky content                | WCAG 2.2 §2.4.11                    |
| Pointer-gesture cancellation (no down-event actuation) | WCAG 2.2 §2.5.2                 |
| Drag alternatives (single-pointer where draggable)  | WCAG 2.2 §2.5.7                    |
| Target size ≥ 24×24 (Refine exceeds at 44×44)      | WCAG 2.2 §2.5.8                     |
| Accessible name contains visible label              | WCAG 2.2 §2.5.3                     |
| Motion pause (hover / keyboard)                    | WCAG 2.2 §2.2.2                     |
| Colour contrast ≥ 4.5:1 (normal text)              | WCAG 2.2 AA §1.4.3                  |
| Colour contrast ≥ 3:1 (large text / UI components) | WCAG 2.2 AA §1.4.11                 |
| Orientation-independent layout                     | WCAG 2.2 §1.3.4                     |
| Autofill for personal-data inputs                  | WCAG 2.2 §1.3.5                     |
| Accessible name on every interactive control       | WCAG 2.2 AA §4.1.2                  |
| Correct ARIA roles and states (valid, non-duplicate) | WCAG 2.2 AA §4.1.2 / §4.1.4        |
| Live region announcements for dynamic changes      | WCAG 2.2 AA §4.1.3                  |
| Forced-colors / Windows High Contrast              | WCAG §1.4.3 enhanced                |
| Reduced-motion fallback                            | WCAG 2.1 §2.3.3                     |

## Known Gaps

| Area                     | Gap                                                 | Planned                         |
| ------------------------ | --------------------------------------------------- | ------------------------------- |
| Visual regression        | No snapshot CI yet                                  | Playwright visual diff in vNext |
| NVDA + JAWS parity       | Not systematically tested                           | Manual audit before 2.0 stable  |
| `ore-select` virtual list | Virtual items need `aria-setsize` / `aria-posinset` | Tracked                         |
