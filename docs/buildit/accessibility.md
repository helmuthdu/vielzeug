---
title: Accessibility Quality Bar — Buildit
description: WCAG compliance contract, testing strategy, and per-component accessibility checklist.
---

# Accessibility Quality Bar

Buildit targets **WCAG 2.1 AA** compliance across the component library. This page documents the quality contract, how it is enforced, and the per-component coverage checklist.

## Quality Contract

Every published component must satisfy:

| Requirement | Standard | Enforcement |
| --- | --- | --- |
| Keyboard navigability | WCAG 2.1 AA §2.1 | Unit tests (keyboard events) |
| Visible focus indicator | WCAG 2.1 AA §2.4.7 | `focus-visible` CSS enforced via mixin |
| Colour contrast ≥ 4.5:1 (normal text) | WCAG 2.1 AA §1.4.3 | Design token review |
| Colour contrast ≥ 3:1 (large text / UI components) | WCAG 2.1 AA §1.4.11 | Design token review |
| Accessible name on every interactive control | WCAG 2.1 AA §4.1.2 | Unit test + axe-core |
| Correct ARIA roles and states | WCAG 2.1 AA §4.1.2 | Unit tests |
| Live region announcements for dynamic changes | WCAG 2.1 AA §4.1.3 | Unit tests |
| Touch target ≥ 44×44 CSS px | WCAG 2.5.5 (AAA) / WCAG 2.2 §2.5.8 | `coarsePointerMixin` |
| Forced-colors / Windows High Contrast | WCAG §1.4.3 enhanced | `forcedColorsMixin` |
| Reduced-motion fallback | WCAG 2.1 §2.3.3 | `reducedMotionMixin` |

## Testing Strategy

Buildit uses a three-layer testing approach:

### 1 — Unit tests (jsdom + craftit test helpers)

Every component has tests that verify:

- Correct `role`, `aria-*` attributes at render time
- Attribute changes reflected in ARIA state (e.g. `aria-disabled`, `aria-busy`, `aria-expanded`)
- Keyboard event handling (Enter/Space/Arrow/Escape)
- Focus management for overlays (trap, restore)
- Slot content announcements via `aria-live` regions

### 2 — Axe-core automated audit (per test)

The `axeCheck` helper is available globally in all Buildit tests:

```ts
import { mount } from '@vielzeug/craftit/testing';

it('has no axe violations', async () => {
  const fixture = await mount('bit-button', { attrs: { color: 'primary' } });
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

| Component | `role` | Keyboard | ARIA attrs | axe | Notes |
| --- | --- | --- | --- | --- | --- |
| `bit-button` | `button` (implicit) | ✅ Enter/Space | `aria-disabled`, `aria-busy` | ✅ | Icon-only requires `aria-label` |
| `bit-input` | `textbox` (native) | ✅ | `aria-describedby`, `aria-invalid`, `aria-required` | ✅ | |
| `bit-textarea` | `textbox` (native) | ✅ | `aria-describedby`, `aria-invalid`, `aria-required` | ✅ | |
| `bit-select` | `combobox` | ✅ Arrow/Enter/Escape | `aria-expanded`, `aria-activedescendant` | ✅ | |
| `bit-combobox` | `combobox` | ✅ Arrow/Enter/Escape | `aria-expanded`, `aria-activedescendant` | ✅ | |
| `bit-checkbox` | `checkbox` (native) | ✅ Space | `aria-checked`, `aria-required` | ✅ | |
| `bit-radio` | `radio` (native) | ✅ Arrow keys | `aria-checked` | ✅ | Group nav |
| `bit-switch` | `switch` | ✅ Space | `aria-checked` | ✅ | |
| `bit-slider` | `slider` | ✅ Arrow keys | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` | ✅ | |
| `bit-rating` | `radiogroup` + `radio` | ✅ Arrow keys | `aria-label` per star | ✅ | |
| `bit-number-input` | `spinbutton` | ✅ Arrow keys | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` | ✅ | |
| `bit-otp-input` | group of `spinbutton` | ✅ Arrow/Tab | `aria-label` per cell | ✅ | |
| `bit-file-input` | `button`-triggered native | ✅ | `aria-label` | ✅ | |

### Feedback

| Component | `role` | Keyboard | ARIA attrs | axe | Notes |
| --- | --- | --- | --- | --- | --- |
| `bit-alert` | `alert` / `status` | ✅ (dismiss) | `aria-live` via region | ✅ | |
| `bit-toast` | `alert` / `status` | ✅ (dismiss) | `aria-live="polite"` or `"assertive"` | ✅ | |
| `bit-progress` | `progressbar` | — | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` | ✅ | |
| `bit-skeleton` | none | — | `aria-hidden="true"` on bones | ✅ | Decorative |
| `bit-badge` | none | — | `aria-label` if meaningful | ✅ | |
| `bit-chip` | `button` (when interactive) | ✅ Enter | `aria-pressed`, `aria-label` | ✅ | |
| **`bit-async`** | dynamic | — | `aria-busy`, `aria-live`, `role="alert"` in error | ✅ | New |

### Disclosure

| Component | `role` | Keyboard | ARIA attrs | axe | Notes |
| --- | --- | --- | --- | --- | --- |
| `bit-accordion` | `button` + region | ✅ Enter/Space | `aria-expanded`, `aria-controls` | ✅ | |
| `bit-tabs` | `tablist` + `tab` + `tabpanel` | ✅ Arrow keys | `aria-selected`, `aria-controls`, `aria-labelledby` | ✅ | |

### Overlay

| Component | `role` | Keyboard | ARIA attrs | axe | Notes |
| --- | --- | --- | --- | --- | --- |
| `bit-dialog` | `dialog` | ✅ Escape, focus trap | `aria-modal`, `aria-labelledby` | ✅ | Focus restored on close |
| `bit-drawer` | `dialog` | ✅ Escape, focus trap | `aria-modal`, `aria-labelledby` | ✅ | Focus restored on close |
| `bit-popover` | `dialog` / `menu` | ✅ Escape | `aria-expanded`, `aria-haspopup` | ✅ | |
| `bit-menu` | `menu` + `menuitem` | ✅ Arrow/Enter/Escape | `aria-orientation` | ✅ | |
| `bit-tooltip` | `tooltip` | ✅ Escape | `aria-describedby` on trigger | ✅ | |

### Content

| Component | `role` | Keyboard | ARIA attrs | axe | Notes |
| --- | --- | --- | --- | --- | --- |
| `bit-card` | `button` (interactive mode) | ✅ Enter/Space | `aria-disabled`, `aria-busy` | ✅ | |
| `bit-table` | `table` (native) | ✅ | `aria-label`, `aria-busy` | ✅ | |
| `bit-pagination` | `navigation` | ✅ | `aria-label`, `aria-current` | ✅ | |
| `bit-breadcrumb` | `navigation` | ✅ | `aria-label`, `aria-current` | ✅ | |
| `bit-avatar` | none | — | `alt` or `aria-label` | ✅ | |

### Layout

| Component | Notes |
| --- | --- |
| `bit-sidebar` | Navigation landmark; `aria-label` required |
| `bit-grid` | Layout only; no interactive semantics |
| `bit-box` | Layout only; no interactive semantics |

## Known Gaps & Planned Work

| Area | Gap | Planned |
| --- | --- | --- |
| Visual regression | No snapshot CI yet | Playwright visual diff in vNext |
| NVDA + JAWS parity | Not systematically tested | Manual audit before 2.0 stable |
| `bit-select` virtual list | Virtual items need `aria-setsize` / `aria-posinset` | Tracked |

## CI Badges

[![CI](https://github.com/helmuthdu/vielzeug/actions/workflows/ci.yml/badge.svg)](https://github.com/helmuthdu/vielzeug/actions/workflows/ci.yml)
[![Tests](https://github.com/helmuthdu/vielzeug/actions/workflows/test-pr.yml/badge.svg)](https://github.com/helmuthdu/vielzeug/actions/workflows/test-pr.yml)
