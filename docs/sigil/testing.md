---
title: Sigil — Testing Utilities
description: ARIA helpers, typed mount wrappers, and event utilities for testing Sigil components.
---

# Testing Utilities

`@vielzeug/sigil/testing` exports a focused set of helpers for writing component tests with
`@vielzeug/craft/testing`. All helpers are tree-shakeable and have no runtime side-effects.

[[toc]]

## Installation

```ts
import { ... } from '@vielzeug/sigil/testing';
```

No additional setup is required — the module is a pure helper layer on top of `@vielzeug/craft/testing`.

## ARIA Attribute Helpers

Boolean predicates for the most common ARIA states:

| Helper                    | Checks                               |
| ------------------------- | ------------------------------------ |
| `isAriaInvalid(el)`       | `aria-invalid="true"`                |
| `isAriaDisabled(el)`      | `aria-disabled="true"`               |
| `isAriaChecked(el)`       | `aria-checked="true"`                |
| `isAriaIndeterminate(el)` | `aria-checked="mixed"`               |
| `isAriaExpanded(el)`      | `aria-expanded="true"`               |
| `isAriaPressed(el)`       | `aria-pressed="true"`                |
| `isAriaRequired(el)`      | `aria-required="true"`               |
| `isAriaHidden(el)`        | `aria-hidden="true"`                 |
| `getAriaLabel(el)`        | Returns `aria-label` or `null`       |
| `getAriaLabelledBy(el)`   | Returns `aria-labelledby` or `null`  |
| `getAriaDescribedBy(el)`  | Returns `aria-describedby` or `null` |
| `getAriaControls(el)`     | Returns `aria-controls` or `null`    |
| `getRole(el)`             | Returns `role` or `null`             |

### ARIA Snapshot

`getAriaState(el)` returns a plain object with the eight most commonly asserted ARIA attributes — useful for inline snapshot assertions:

```ts
expect(getAriaState(input)).toMatchObject({ invalid: 'true', required: 'true' });
```

## Shadow DOM Helpers

```ts
// Query a single element inside the host's shadow root
const inner = queryInShadow(host, 'input');

// Query all matching elements
const items = queryAllInShadow(host, '[role="option"]');
```

## Form-Associated Helpers

```ts
// Returns the current form value (ElementInternals-based or reflected `.value`)
const value = getFormValue(el);

// Returns true when the element has no constraint violations
const valid = isFormValid(el);
```

## Event Helpers

```ts
// Create a synthetic KeyboardEvent for keyboard navigation tests
const ev = keyEvent('ArrowDown', { shiftKey: true });
element.dispatchEvent(ev);
```

## Timing Helpers

```ts
// Wait for reactive signal effects to settle (microtask)
await nextTick();

// Wait a fixed number of milliseconds (use sparingly)
await wait(50);
```

## ID Counter Reset

Call `resetIdCounter()` in a `beforeEach` hook when you need **deterministic stable IDs** across test runs:

```ts
import { resetIdCounter } from '@vielzeug/sigil/testing';

beforeEach(() => resetIdCounter());
```

## Typed Mount Wrappers

Typed wrappers catch prop-name typos at compile time and avoid manual HTML serialization.

```ts
import {
  mountBitButton,
  mountBitButtonGroup,
  mountBitCheckbox,
  mountBitCheckboxGroup,
  mountBitCombobox,
  mountBitFileInput,
  mountBitForm,
  mountBitInput,
  mountBitNumberInput,
  mountBitOtpInput,
  mountBitRadio,
  mountBitRadioGroup,
  mountBitRating,
  mountBitSelect,
  mountBitSlider,
  mountBitSwitch,
  mountBitTextarea,
} from '@vielzeug/sigil/testing';
```

Each wrapper follows the same signature:

```ts
mountBit<Component>(props?, opts?)
// props  — Partial<Bit<Component>Props>, type-checked
// opts   — { innerHTML?: string }        for slotted content
```

Example:

```ts
const fixture = await mountBitInput({ label: 'Name', required: true });
const input = queryInShadow(fixture.el, 'input')!;

expect(isAriaRequired(input)).toBe(true);
```

Pass slot content via `opts.innerHTML`:

```ts
const fixture = await mountBitSelect(
  { label: 'Country' },
  { innerHTML: '<bit-option value="us">United States</bit-option>' },
);
```
