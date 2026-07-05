---
title: Refine — Accessibility
description: WCAG compliance, keyboard support, testing strategy, and per-component coverage for Refine.
---

# Accessibility

[[toc]]

Refine targets **WCAG 2.1 AA** compliance across the component library. ARIA roles and states are managed automatically. Keyboard navigation, focus management, and live-region announcements are built into each component.

## What You're Responsible For

Most accessibility is handled for you. Two things require action on your side:

- **Icon-only buttons** must have a `label` attribute — it becomes `aria-label`. Without it, screen readers have nothing to announce.
- **Decorative icons** should have `aria-hidden="true"` so screen readers skip them. Meaningful standalone icons need an `aria-label`.

```html
<!-- Icon-only button — label required -->
<ore-button icon-only label="Delete item" color="error">
  <ore-icon name="trash-2" size="18"></ore-icon>
</ore-button>

<!-- Decorative icon — hidden from screen readers -->
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

**1 — Unit tests (jsdom + Ore test helpers)**

Every component has tests verifying correct `role` and `aria-*` attributes at render time, ARIA state changes on attribute mutation, keyboard event handling, focus management for overlays, and live-region announcements.

**2 — Axe-core automated audit**

The `axeCheck` helper is available globally in all Refine tests:

```ts
import { mount } from '@vielzeug/ore/testing';

it('has no axe violations', async () => {
  const fixture = await mount('ore-button', { attrs: { color: 'primary' } });
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
| `ore-number-input` | `spinbutton`              | Arrow keys                        | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`                     |
| `ore-otp-input`    | `group` of text inputs    | Arrow / Backspace / Tab           | `aria-label` per cell                                                 |
| `ore-file-input`   | `button`-triggered native | Standard                          | `aria-label`                                                          |

### Feedback

| Component           | Role               | Keyboard          | Key ARIA attrs                            |
| ------------------- | ------------------ | ----------------- | ----------------------------------------- |
| `ore-alert`          | `alert` / `status` | Dismiss button    | `aria-live` via region                    |
| `ore-toast`          | `alert` / `status` | Dismiss button    | `aria-live="polite"` or `"assertive"`     |
| `ore-async`          | Dynamic            | —                 | `aria-busy`, `aria-live`, `role="alert"` in error |
| `ore-progress`       | `progressbar`      | —                 | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` |
| `ore-skeleton`       | None (decorative)  | —                 | `aria-hidden="true"` on bones             |
| `ore-badge`          | None               | —                 | `aria-label` if meaningful                |
| `ore-chip`           | `button` (interactive) | Enter         | `aria-pressed`, `aria-label`              |

### Disclosure

| Component      | Role                           | Keyboard              | Key ARIA attrs                                      |
| -------------- | ------------------------------ | --------------------- | --------------------------------------------------- |
| `ore-accordion` | `button` + region              | Enter / Space         | `aria-expanded`, `aria-controls`                    |
| `ore-tabs`      | `tablist` + `tab` + `tabpanel` | Arrow keys            | `aria-selected`, `aria-controls`, `aria-labelledby` |

### Overlay

| Component    | Role              | Keyboard                   | Key ARIA attrs                    | Notes                   |
| ------------ | ----------------- | -------------------------- | --------------------------------- | ----------------------- |
| `ore-dialog`  | `dialog`          | Escape, focus trap         | `aria-modal`, `aria-labelledby`   | Focus restored on close |
| `ore-drawer`  | `dialog`          | Escape, focus trap         | `aria-modal`, `aria-labelledby`   | Focus restored on close |
| `ore-popover` | `dialog` / `menu` | Escape                     | `aria-expanded`, `aria-haspopup`  |                         |
| `ore-menu`    | `menu` + `menuitem` | Arrow / Enter / Escape   | `aria-orientation`                |                         |
| `ore-tooltip` | `tooltip`         | Escape                     | `aria-describedby` on trigger     |                         |

### Content

| Component       | Role                      | Keyboard      | Key ARIA attrs               |
| --------------- | ------------------------- | ------------- | ---------------------------- |
| `ore-card`       | `button` (interactive)    | Enter / Space | `aria-disabled`, `aria-busy` |
| `ore-table`      | `table` (native)          | Standard      | `aria-label`, `aria-busy`    |
| `ore-pagination` | `navigation`              | Standard      | `aria-label`, `aria-current` |
| `ore-breadcrumb` | `navigation`              | Standard      | `aria-label`, `aria-current` |
| `ore-avatar`     | None                      | —             | `alt` or `aria-label`        |

### Layout

| Component    | Notes                                                          |
| ------------ | -------------------------------------------------------------- |
| `ore-sidebar` | Navigation landmark — provide `aria-label` for screen readers  |
| `ore-navbar`  | Navigation landmark — provide `aria-label` for screen readers  |
| `ore-grid`    | Layout only, no interactive semantics                          |
| `ore-box`     | Layout only, no interactive semantics                          |

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
| `ore-select` virtual list | Virtual items need `aria-setsize` / `aria-posinset` | Tracked                         |
