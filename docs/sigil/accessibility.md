---
title: Sigil — Accessibility
description: WCAG compliance, keyboard support, testing strategy, and per-component coverage for Sigil.
---

# Accessibility

[[toc]]

Sigil targets **WCAG 2.1 AA** compliance across the component library. ARIA roles and states are managed automatically. Keyboard navigation, focus management, and live-region announcements are built into each component.

## What You're Responsible For

Most accessibility is handled for you. Two things require action on your side:

- **Icon-only buttons** must have a `label` attribute — it becomes `aria-label`. Without it, screen readers have nothing to announce.
- **Decorative icons** should have `aria-hidden="true"` so screen readers skip them. Meaningful standalone icons need an `aria-label`.

```html
<!-- Icon-only button — label required -->
<sg-button icon-only label="Delete item" color="error">
  <sg-icon name="trash-2" size="18"></sg-icon>
</sg-button>

<!-- Decorative icon — hidden from screen readers -->
<sg-icon name="check" size="16" aria-hidden="true"></sg-icon>

<!-- Meaningful standalone icon -->
<sg-icon name="warning" size="16" aria-label="Warning"></sg-icon>
```

You can also connect an input to external help text using `aria-describedby`:

```html
<sg-input label="Password" aria-describedby="pwd-hint" />
<p id="pwd-hint">Minimum 8 characters, one uppercase, one number.</p>
```

## Testing Strategy

Sigil uses a three-layer approach.

**1 — Unit tests (jsdom + Craft test helpers)**

Every component has tests verifying correct `role` and `aria-*` attributes at render time, ARIA state changes on attribute mutation, keyboard event handling, focus management for overlays, and live-region announcements.

**2 — Axe-core automated audit**

The `axeCheck` helper is available globally in all Sigil tests:

```ts
import { mount } from '@vielzeug/craft/testing';

it('has no axe violations', async () => {
  const fixture = await mount('sg-button', { attrs: { color: 'primary' } });
  const results = await axeCheck(fixture.element);
  expect(results.violations).toHaveLength(0);
});
```

Only the `wcag2a`, `wcag2aa`, and `best-practice` rule sets run in CI to keep test suites fast.

**3 — Manual checklist (per release)**

Before each minor release:

- [ ] Focus order is logical and follows visual layout
- [ ] All interactive controls have visible focus rings
- [ ] No unintentional keyboard traps (dialogs and drawers are intentional)
- [ ] Dynamic changes (toasts, alerts, async states) are announced
- [ ] Images and icons have appropriate `alt` or `aria-hidden`
- [ ] Form labels are connected to their controls
- [ ] Error states are communicated in text, not color alone

## Per-Component Coverage

### Inputs

| Component         | Role                      | Keyboard                          | Key ARIA attrs                                                        |
| ----------------- | ------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| `sg-button`       | `button` (implicit)       | Enter / Space                     | `aria-disabled`, `aria-busy`                                          |
| `sg-input`        | `textbox` (native)        | Standard                          | `aria-describedby`, `aria-invalid`, `aria-required`                   |
| `sg-textarea`     | `textbox` (native)        | Standard                          | `aria-describedby`, `aria-invalid`, `aria-required`                   |
| `sg-select`       | `combobox`                | Arrow / Enter / Escape            | `aria-expanded`, `aria-activedescendant`                              |
| `sg-combobox`     | `combobox`                | Arrow / Enter / Escape            | `aria-expanded`, `aria-activedescendant`                              |
| `sg-checkbox`     | `checkbox` (native)       | Space                             | `aria-checked`, `aria-required`                                       |
| `sg-radio`        | `radio` (native)          | Arrow keys (group nav)            | `aria-checked`                                                        |
| `sg-switch`       | `switch`                  | Space                             | `aria-checked`                                                        |
| `sg-slider`       | `slider`                  | Arrow keys                        | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext`   |
| `sg-rating`       | `radiogroup` + `radio`    | Arrow keys                        | `aria-label` per star                                                 |
| `sg-number-input` | `spinbutton`              | Arrow keys                        | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`                     |
| `sg-otp-input`    | group of `spinbutton`     | Arrow / Tab                       | `aria-label` per cell                                                 |
| `sg-file-input`   | `button`-triggered native | Standard                          | `aria-label`                                                          |

### Feedback

| Component           | Role               | Keyboard          | Key ARIA attrs                            |
| ------------------- | ------------------ | ----------------- | ----------------------------------------- |
| `sg-alert`          | `alert` / `status` | Dismiss button    | `aria-live` via region                    |
| `sg-toast`          | `alert` / `status` | Dismiss button    | `aria-live="polite"` or `"assertive"`     |
| `sg-async`          | Dynamic            | —                 | `aria-busy`, `aria-live`, `role="alert"` in error |
| `sg-progress`       | `progressbar`      | —                 | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` |
| `sg-skeleton`       | None (decorative)  | —                 | `aria-hidden="true"` on bones             |
| `sg-badge`          | None               | —                 | `aria-label` if meaningful                |
| `sg-chip`           | `button` (interactive) | Enter         | `aria-pressed`, `aria-label`              |

### Disclosure

| Component      | Role                           | Keyboard              | Key ARIA attrs                                      |
| -------------- | ------------------------------ | --------------------- | --------------------------------------------------- |
| `sg-accordion` | `button` + region              | Enter / Space         | `aria-expanded`, `aria-controls`                    |
| `sg-tabs`      | `tablist` + `tab` + `tabpanel` | Arrow keys            | `aria-selected`, `aria-controls`, `aria-labelledby` |

### Overlay

| Component    | Role              | Keyboard                   | Key ARIA attrs                    | Notes                   |
| ------------ | ----------------- | -------------------------- | --------------------------------- | ----------------------- |
| `sg-dialog`  | `dialog`          | Escape, focus trap         | `aria-modal`, `aria-labelledby`   | Focus restored on close |
| `sg-drawer`  | `dialog`          | Escape, focus trap         | `aria-modal`, `aria-labelledby`   | Focus restored on close |
| `sg-popover` | `dialog` / `menu` | Escape                     | `aria-expanded`, `aria-haspopup`  |                         |
| `sg-menu`    | `menu` + `menuitem` | Arrow / Enter / Escape   | `aria-orientation`                |                         |
| `sg-tooltip` | `tooltip`         | Escape                     | `aria-describedby` on trigger     |                         |

### Content

| Component       | Role                      | Keyboard      | Key ARIA attrs               |
| --------------- | ------------------------- | ------------- | ---------------------------- |
| `sg-card`       | `button` (interactive)    | Enter / Space | `aria-disabled`, `aria-busy` |
| `sg-table`      | `table` (native)          | Standard      | `aria-label`, `aria-busy`    |
| `sg-pagination` | `navigation`              | Standard      | `aria-label`, `aria-current` |
| `sg-breadcrumb` | `navigation`              | Standard      | `aria-label`, `aria-current` |
| `sg-avatar`     | None                      | —             | `alt` or `aria-label`        |

### Layout

| Component    | Notes                                                          |
| ------------ | -------------------------------------------------------------- |
| `sg-sidebar` | Navigation landmark — provide `aria-label` for screen readers  |
| `sg-navbar`  | Navigation landmark — provide `aria-label` for screen readers  |
| `sg-grid`    | Layout only, no interactive semantics                          |
| `sg-box`     | Layout only, no interactive semantics                          |

## Compliance Contract

Every published component must satisfy:

| Requirement                                        | Standard                            |
| -------------------------------------------------- | ----------------------------------- |
| Keyboard navigability                              | WCAG 2.1 AA §2.1                    |
| Visible focus indicator                            | WCAG 2.1 AA §2.4.7                  |
| Colour contrast ≥ 4.5:1 (normal text)              | WCAG 2.1 AA §1.4.3                  |
| Colour contrast ≥ 3:1 (large text / UI components) | WCAG 2.1 AA §1.4.11                 |
| Accessible name on every interactive control       | WCAG 2.1 AA §4.1.2                  |
| Correct ARIA roles and states                      | WCAG 2.1 AA §4.1.2                  |
| Live region announcements for dynamic changes      | WCAG 2.1 AA §4.1.3                  |
| Touch target ≥ 44×44 CSS px                        | WCAG 2.2 §2.5.8                     |
| Forced-colors / Windows High Contrast              | WCAG §1.4.3 enhanced                |
| Reduced-motion fallback                            | WCAG 2.1 §2.3.3                     |

## Known Gaps

| Area                     | Gap                                                 | Planned                         |
| ------------------------ | --------------------------------------------------- | ------------------------------- |
| Visual regression        | No snapshot CI yet                                  | Playwright visual diff in vNext |
| NVDA + JAWS parity       | Not systematically tested                           | Manual audit before 2.0 stable  |
| `sg-select` virtual list | Virtual items need `aria-setsize` / `aria-posinset` | Tracked                         |
