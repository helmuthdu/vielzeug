---
title: Sigil — Testing Utilities
description: ARIA helpers, typed mount wrappers, and event utilities for testing Sigil components.
---

# Testing Utilities

[[toc]]

`@vielzeug/sigil/testing` provides helpers for writing component tests on top of `@vielzeug/craft/testing`. All helpers are tree-shakeable with no runtime side-effects.

The module groups into four concerns: **ARIA assertions** (check what the DOM exposes to assistive technology), **shadow DOM queries** (reach inside component internals), **form helpers** (read form-associated values), and **event / timing utilities** (simulate keyboard input and wait for reactive updates).

```ts
import { isAriaInvalid, queryInShadow, mountSgInput } from '@vielzeug/sigil/testing';
```

## ARIA Helpers

Boolean predicates and getters for the most common ARIA states:

| Helper                    | Returns                              |
| ------------------------- | ------------------------------------ |
| `isAriaInvalid(el)`       | `true` when `aria-invalid="true"`    |
| `isAriaDisabled(el)`      | `true` when `aria-disabled="true"`   |
| `isAriaChecked(el)`       | `true` when `aria-checked="true"`    |
| `isAriaIndeterminate(el)` | `true` when `aria-checked="mixed"`   |
| `isAriaExpanded(el)`      | `true` when `aria-expanded="true"`   |
| `isAriaPressed(el)`       | `true` when `aria-pressed="true"`    |
| `isAriaRequired(el)`      | `true` when `aria-required="true"`   |
| `isAriaHidden(el)`        | `true` when `aria-hidden="true"`     |
| `getAriaLabel(el)`        | `aria-label` value or `null`         |
| `getAriaLabelledBy(el)`   | `aria-labelledby` value or `null`    |
| `getAriaDescribedBy(el)`  | `aria-describedby` value or `null`   |
| `getAriaControls(el)`     | `aria-controls` value or `null`      |
| `getRole(el)`             | `role` value or `null`               |

### Snapshot Assertions

`getAriaState(el)` returns a plain object snapshot of the eight most commonly asserted ARIA attributes — useful for inline snapshot assertions:

```ts
expect(getAriaState(input)).toMatchObject({ invalid: 'true', required: 'true' });
```

## Shadow DOM Queries

```ts
// Query a single element inside the host's shadow root
const inner = queryInShadow(host, 'input');

// Query all matching elements
const items = queryAllInShadow(host, '[role="option"]');
```

## Form-Associated Helpers

```ts
// Read the current form value (ElementInternals-based or reflected .value)
const value = getFormValue(el);

// True when the element has no constraint violations
const valid = isFormValid(el);
```

## Event Helpers

```ts
// Synthetic KeyboardEvent for keyboard navigation tests
const ev = keyEvent('ArrowDown', { shiftKey: true });
element.dispatchEvent(ev);
```

## Timing Helpers

```ts
// Wait for reactive signal effects to settle (microtask flush)
await nextTick();

// Wait a fixed number of milliseconds — use sparingly
await wait(50);
```

## ID Counter Reset

Sigil components generate stable IDs for ARIA associations. Reset the counter in `beforeEach` when you need deterministic IDs across test runs:

```ts
import { resetIdCounter } from '@vielzeug/sigil/testing';

beforeEach(() => resetIdCounter());
```

## Typed Mount Wrappers

Typed wrappers catch prop-name typos at compile time and avoid manual HTML serialization. Each wrapper is named `mountSg{ComponentName}`:

```ts
import {
  mountSgButton,
  mountSgButtonGroup,
  mountSgCheckbox,
  mountSgCheckboxGroup,
  mountSgCombobox,
  mountSgFileInput,
  mountSgForm,
  mountSgInput,
  mountSgNumberInput,
  mountSgOtpInput,
  mountSgRadio,
  mountSgRadioGroup,
  mountSgRating,
  mountSgSelect,
  mountSgSlider,
  mountSgSwitch,
  mountSgTextarea,
} from '@vielzeug/sigil/testing';
```

All wrappers share the same signature:

```ts
mountSg{Component}(props?, opts?)
// props — Partial<ComponentProps>, type-checked at compile time
// opts  — { innerHTML?: string } for slotted content
```

**Example — asserting ARIA state:**

```ts
const fixture = await mountSgInput({ label: 'Name', required: true });
const input = queryInShadow(fixture.el, 'input')!;

expect(isAriaRequired(input)).toBe(true);
```

**Example — passing slot content:**

```ts
const fixture = await mountSgSelect(
  { label: 'Country' },
  { innerHTML: '<sg-option value="us">United States</sg-option>' },
);
```
