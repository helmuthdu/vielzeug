---
title: Refine — Testing Utilities
description: ARIA helpers, typed mount wrappers, and event utilities for testing Refine components.
---

# Testing Utilities

[[toc]]

`@vielzeug/refine/testing` provides helpers for writing component tests on top of `@vielzeug/ore/testing`. All helpers are tree-shakeable with no runtime side-effects.

The module groups into three concerns: **ARIA assertions** (check what the DOM exposes to assistive technology — refine-specific, since they're about testing a component's accessibility *contract*), **form helpers** (read form-associated values), and **typed mount wrappers**. Import generic DOM queries, events, and timing directly from [`@vielzeug/assay`](/assay/).

```ts
import { queryInShadow } from '@vielzeug/assay';
import { isAriaInvalid, mountOreInput } from '@vielzeug/refine/testing';
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

Import from [`@vielzeug/assay`](/assay/api#query-helpers). These helpers return `null`/`[]` instead of throwing when the host has no shadow root:

```ts
// Query a single element inside the host's shadow root
const inner = queryInShadow(host, 'input');

// Query all matching elements
const items = queryAllInShadow(host, '[role="option"]');

// Query by CSS `part` attribute — shorthand for queryInShadow(host, '[part="x"]')
const trigger = queryPart(host, 'trigger');

// Light-DOM children assigned to a slot
const footerActions = getSlotted(host, 'footer');
```

## Form-Associated Helpers

```ts
// Read the current form value (ElementInternals-based or reflected .value)
const value = getFormValue(el);

// True when the element has no constraint violations
const valid = isFormValid(el);
```

## Event and Timing Helpers

Dispatch generic DOM events with Assay's named helpers:

```ts
import { fireKeyDown } from '@vielzeug/assay';

fireKeyDown(element, { key: 'ArrowDown', shiftKey: true });
```

Import timing helpers from Assay:

```ts
import { delay, nextTick } from '@vielzeug/assay';

// Wait for reactive signal effects to settle (microtask flush)
await nextTick();

// Wait a fixed number of milliseconds — use sparingly, prefer nextTick()/waitUntil()
await delay(50);
```

## ID Counter Reset

Refine components generate stable IDs for ARIA associations. Reset the counter in `beforeEach` when you need deterministic IDs across test runs:

```ts
import { resetStableIdCounter } from '@vielzeug/refine/testing';

beforeEach(() => resetStableIdCounter());
```

## Typed Mount Wrappers

Typed wrappers catch prop-name typos at compile time and avoid manual HTML serialization. Each wrapper is named `mountSg{ComponentName}`:

```ts
import {
  mountOreButton,
  mountOreButtonGroup,
  mountOreCheckbox,
  mountOreCheckboxGroup,
  mountOreCombobox,
  mountOreFileInput,
  mountOreForm,
  mountOreInput,
  mountOreNumberInput,
  mountOreOtpInput,
  mountOreRadio,
  mountOreRadioGroup,
  mountOreRating,
  mountOreSelect,
  mountOreSlider,
  mountOreSwitch,
  mountOreTextarea,
} from '@vielzeug/refine/testing';
```

All wrappers share the same signature:

```ts
mountSg{Component}(props?, opts?)
// props — Partial<ComponentProps>, type-checked at compile time
// opts  — { innerHTML?: string } for slotted content
```

**Example — asserting ARIA state:**

```ts
const fixture = await mountOreInput({ label: 'Name', required: true });
const input = queryInShadow(fixture.el, 'input')!;

expect(isAriaRequired(input)).toBe(true);
```

**Example — passing slot content:**

```ts
const fixture = await mountOreSelect(
  { label: 'Country' },
  { innerHTML: '<ore-option value="us">United States</ore-option>' },
);
```
