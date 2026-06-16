---
title: Accessibility Quality Bar — Sigil
description: WCAG compliance contract, testing strategy, and per-component accessibility checklist.
---

# Accessibility Quality Bar

Sigil targets **WCAG 2.1 AA** compliance across the component library. This page documents the quality contract, how it is enforced, and the per-component coverage checklist.

## Quality Contract

Every published component must satisfy:

| Requirement                                        | Standard                           | Enforcement                            |
| -------------------------------------------------- | ---------------------------------- | -------------------------------------- |
| Keyboard navigability                              | WCAG 2.1 AA §2.1                   | Unit tests (keyboard events)           |
| Visible focus indicator                            | WCAG 2.1 AA §2.4.7                 | `focus-visible` CSS enforced via mixin |
| Colour contrast ≥ 4.5:1 (normal text)              | WCAG 2.1 AA §1.4.3                 | Design token review                    |
| Colour contrast ≥ 3:1 (large text / UI components) | WCAG 2.1 AA §1.4.11                | Design token review                    |
| Accessible name on every interactive control       | WCAG 2.1 AA §4.1.2                 | Unit test + axe-core                   |
| Correct ARIA roles and states                      | WCAG 2.1 AA §4.1.2                 | Unit tests                             |
| Live region announcements for dynamic changes      | WCAG 2.1 AA §4.1.3                 | Unit tests                             |
| Touch target ≥ 44×44 CSS px                        | WCAG 2.5.5 (AAA) / WCAG 2.2 §2.5.8 | `coarsePointerMixin`                   |
| Forced-colors / Windows High Contrast              | WCAG §1.4.3 enhanced               | `forcedColorsMixin`                    |
| Reduced-motion fallback                            | WCAG 2.1 §2.3.3                    | `reducedMotionMixin`                   |

## Testing Strategy

Sigil uses a three-layer testing approach:

### 1 — Unit tests (jsdom + craft test helpers)

Every component has tests that verify:

- Correct `role`, `aria-*` attributes at render time
- Attribute changes reflected in ARIA state (e.g. `aria-disabled`, `aria-busy`, `aria-expanded`)
- Keyboard event handling (Enter/Space/Arrow/Escape)
- Focus management for overlays (trap, restore)
- Slot content announcements via `aria-live` regions

### 2 — Axe-core automated audit (per test)

The `axeCheck` helper is available globally in all Sigil tests:

```ts
import { mount } from '@vielzeug/craft/testing';

it('has no axe violations', async () => {
  const fixture = await mount('sg-button', { attrs: { color: 'primary' } });
  const results = await axeCheck(fixture.element);

  expect(results.violations).toHaveLength(0);
});
```

Run only the `wcag2a`, `wcag2aa`, and `best-practice` rule sets to keep CI fast and focused.

### 3 — Manual audit checklist (per release)

Before each minor release, run the checklist below manually or with a screen reader (NVDA + Chrome, VoiceOver + Safari):

- [ ] Focus order is logical and follows visual layout
- [ ] All interactive controls have visible focus rings
- [ ] No content is keyboard-trapped unless intentional (dialogs, drawers)
- [ ] Dynamic changes (toasts, alerts, async states) are announced
- [ ] Images and icons have appropriate `alt` or `aria-hidden`
- [ ] Form labels are connected to their controls
- [ ] Error states are communicated in text (not colour alone)

## Per-Component A11y Coverage

### Inputs

| Component         | `role`                    | Keyboard                                                      | ARIA attrs                                                          | axe                                        | Notes                           |
| ----------------- | ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ | ------------------------------- |
| `sg-button`       | `button` (implicit)       | <sg-icon name="check" size="16"></sg-icon> Enter/Space        | `aria-disabled`, `aria-busy`                                        | <sg-icon name="check" size="16"></sg-icon> | Icon-only requires `aria-label` |
| `sg-input`        | `textbox` (native)        | <sg-icon name="check" size="16"></sg-icon>                    | `aria-describedby`, `aria-invalid`, `aria-required`                 | <sg-icon name="check" size="16"></sg-icon> |                                 |
| `sg-textarea`     | `textbox` (native)        | <sg-icon name="check" size="16"></sg-icon>                    | `aria-describedby`, `aria-invalid`, `aria-required`                 | <sg-icon name="check" size="16"></sg-icon> |                                 |
| `sg-select`       | `combobox`                | <sg-icon name="check" size="16"></sg-icon> Arrow/Enter/Escape | `aria-expanded`, `aria-activedescendant`                            | <sg-icon name="check" size="16"></sg-icon> |                                 |
| `sg-combobox`     | `combobox`                | <sg-icon name="check" size="16"></sg-icon> Arrow/Enter/Escape | `aria-expanded`, `aria-activedescendant`                            | <sg-icon name="check" size="16"></sg-icon> |                                 |
| `sg-checkbox`     | `checkbox` (native)       | <sg-icon name="check" size="16"></sg-icon> Space              | `aria-checked`, `aria-required`                                     | <sg-icon name="check" size="16"></sg-icon> |                                 |
| `sg-radio`        | `radio` (native)          | <sg-icon name="check" size="16"></sg-icon> Arrow keys         | `aria-checked`                                                      | <sg-icon name="check" size="16"></sg-icon> | Group nav                       |
| `sg-switch`       | `switch`                  | <sg-icon name="check" size="16"></sg-icon> Space              | `aria-checked`                                                      | <sg-icon name="check" size="16"></sg-icon> |                                 |
| `sg-slider`       | `slider`                  | <sg-icon name="check" size="16"></sg-icon> Arrow keys         | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` | <sg-icon name="check" size="16"></sg-icon> |                                 |
| `sg-rating`       | `radiogroup` + `radio`    | <sg-icon name="check" size="16"></sg-icon> Arrow keys         | `aria-label` per star                                               | <sg-icon name="check" size="16"></sg-icon> |                                 |
| `sg-number-input` | `spinbutton`              | <sg-icon name="check" size="16"></sg-icon> Arrow keys         | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`                   | <sg-icon name="check" size="16"></sg-icon> |                                 |
| `sg-otp-input`    | group of `spinbutton`     | <sg-icon name="check" size="16"></sg-icon> Arrow/Tab          | `aria-label` per cell                                               | <sg-icon name="check" size="16"></sg-icon> |                                 |
| `sg-file-input`   | `button`-triggered native | <sg-icon name="check" size="16"></sg-icon>                    | `aria-label`                                                        | <sg-icon name="check" size="16"></sg-icon> |                                 |

### Feedback

| Component      | `role`                      | Keyboard                                             | ARIA attrs                                                          | axe                                        | Notes      |
| -------------- | --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ | ---------- |
| `sg-alert`     | `alert` / `status`          | <sg-icon name="check" size="16"></sg-icon> (dismiss) | `aria-live` via region                                              | <sg-icon name="check" size="16"></sg-icon> |            |
| `sg-toast`     | `alert` / `status`          | <sg-icon name="check" size="16"></sg-icon> (dismiss) | `aria-live="polite"` or `"assertive"`                               | <sg-icon name="check" size="16"></sg-icon> |            |
| `sg-progress`  | `progressbar`               | —                                                    | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` | <sg-icon name="check" size="16"></sg-icon> |            |
| `sg-skeleton`  | none                        | —                                                    | `aria-hidden="true"` on bones                                       | <sg-icon name="check" size="16"></sg-icon> | Decorative |
| `sg-badge`     | none                        | —                                                    | `aria-label` if meaningful                                          | <sg-icon name="check" size="16"></sg-icon> |            |
| `sg-chip`      | `button` (when interactive) | <sg-icon name="check" size="16"></sg-icon> Enter     | `aria-pressed`, `aria-label`                                        | <sg-icon name="check" size="16"></sg-icon> |            |
| **`sg-async`** | dynamic                     | —                                                    | `aria-busy`, `aria-live`, `role="alert"` in error                   | <sg-icon name="check" size="16"></sg-icon> | New        |

### Disclosure

| Component      | `role`                         | Keyboard                                               | ARIA attrs                                          | axe                                        | Notes |
| -------------- | ------------------------------ | ------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------ | ----- |
| `sg-accordion` | `button` + region              | <sg-icon name="check" size="16"></sg-icon> Enter/Space | `aria-expanded`, `aria-controls`                    | <sg-icon name="check" size="16"></sg-icon> |       |
| `sg-tabs`      | `tablist` + `tab` + `tabpanel` | <sg-icon name="check" size="16"></sg-icon> Arrow keys  | `aria-selected`, `aria-controls`, `aria-labelledby` | <sg-icon name="check" size="16"></sg-icon> |       |

### Overlay

| Component    | `role`              | Keyboard                                                      | ARIA attrs                       | axe                                        | Notes                   |
| ------------ | ------------------- | ------------------------------------------------------------- | -------------------------------- | ------------------------------------------ | ----------------------- |
| `sg-dialog`  | `dialog`            | <sg-icon name="check" size="16"></sg-icon> Escape, focus trap | `aria-modal`, `aria-labelledby`  | <sg-icon name="check" size="16"></sg-icon> | Focus restored on close |
| `sg-drawer`  | `dialog`            | <sg-icon name="check" size="16"></sg-icon> Escape, focus trap | `aria-modal`, `aria-labelledby`  | <sg-icon name="check" size="16"></sg-icon> | Focus restored on close |
| `sg-popover` | `dialog` / `menu`   | <sg-icon name="check" size="16"></sg-icon> Escape             | `aria-expanded`, `aria-haspopup` | <sg-icon name="check" size="16"></sg-icon> |                         |
| `sg-menu`    | `menu` + `menuitem` | <sg-icon name="check" size="16"></sg-icon> Arrow/Enter/Escape | `aria-orientation`               | <sg-icon name="check" size="16"></sg-icon> |                         |
| `sg-tooltip` | `tooltip`           | <sg-icon name="check" size="16"></sg-icon> Escape             | `aria-describedby` on trigger    | <sg-icon name="check" size="16"></sg-icon> |                         |

### Content

| Component       | `role`                      | Keyboard                                               | ARIA attrs                   | axe                                        | Notes |
| --------------- | --------------------------- | ------------------------------------------------------ | ---------------------------- | ------------------------------------------ | ----- |
| `sg-card`       | `button` (interactive mode) | <sg-icon name="check" size="16"></sg-icon> Enter/Space | `aria-disabled`, `aria-busy` | <sg-icon name="check" size="16"></sg-icon> |       |
| `sg-table`      | `table` (native)            | <sg-icon name="check" size="16"></sg-icon>             | `aria-label`, `aria-busy`    | <sg-icon name="check" size="16"></sg-icon> |       |
| `sg-pagination` | `navigation`                | <sg-icon name="check" size="16"></sg-icon>             | `aria-label`, `aria-current` | <sg-icon name="check" size="16"></sg-icon> |       |
| `sg-breadcrumb` | `navigation`                | <sg-icon name="check" size="16"></sg-icon>             | `aria-label`, `aria-current` | <sg-icon name="check" size="16"></sg-icon> |       |
| `sg-avatar`     | none                        | —                                                      | `alt` or `aria-label`        | <sg-icon name="check" size="16"></sg-icon> |       |

### Layout

| Component    | Notes                                      |
| ------------ | ------------------------------------------ |
| `sg-sidebar` | Navigation landmark; `aria-label` required |
| `sg-grid`    | Layout only; no interactive semantics      |
| `sg-box`     | Layout only; no interactive semantics      |

## Known Gaps & Planned Work

| Area                     | Gap                                                 | Planned                         |
| ------------------------ | --------------------------------------------------- | ------------------------------- |
| Visual regression        | No snapshot CI yet                                  | Playwright visual diff in vNext |
| NVDA + JAWS parity       | Not systematically tested                           | Manual audit before 2.0 stable  |
| `sg-select` virtual list | Virtual items need `aria-setsize` / `aria-posinset` | Tracked                         |

## CI Badges

[![CI](https://github.com/helmuthdu/vielzeug/actions/workflows/ci.yml/badge.svg)](https://github.com/helmuthdu/vielzeug/actions/workflows/ci.yml)
[![Tests](https://github.com/helmuthdu/vielzeug/actions/workflows/test-pr.yml/badge.svg)](https://github.com/helmuthdu/vielzeug/actions/workflows/test-pr.yml)
