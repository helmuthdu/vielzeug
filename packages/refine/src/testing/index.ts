/**
 * @vielzeug/refine/testing
 *
 * Testing utilities for refine components. Provides a11y helpers, ARIA query
 * utilities, and convenience wrappers for common patterns in component tests.
 *
 * @example
 * ```typescript
 * import { getAriaLabel, getAriaDescribedBy, isAriaInvalid } from '@vielzeug/refine/testing';
 * import { mount } from '@vielzeug/ore/testing';
 *
 * const fixture = mount('<ore-input label="Name"></ore-input>');
 * const input = fixture.query('input')!;
 * expect(isAriaInvalid(input)).toBe(false);
 * ```
 */

// ── ARIA attribute helpers ────────────────────────────────────────────────────

/** Returns whether `aria-invalid="true"` is set on the element. */
export const isAriaInvalid = (el: Element): boolean => el.getAttribute('aria-invalid') === 'true';

/** Returns whether `aria-disabled="true"` is set on the element. */
export const isAriaDisabled = (el: Element): boolean => el.getAttribute('aria-disabled') === 'true';

/** Returns whether `aria-checked="true"` is set on the element. */
export const isAriaChecked = (el: Element): boolean => el.getAttribute('aria-checked') === 'true';

/** Returns whether `aria-checked="mixed"` is set on the element. */
export const isAriaIndeterminate = (el: Element): boolean => el.getAttribute('aria-checked') === 'mixed';

/** Returns whether `aria-expanded="true"` is set on the element. */
export const isAriaExpanded = (el: Element): boolean => el.getAttribute('aria-expanded') === 'true';

/** Returns whether `aria-pressed="true"` is set on the element. */
export const isAriaPressed = (el: Element): boolean => el.getAttribute('aria-pressed') === 'true';

/** Returns whether `aria-required="true"` is set on the element. */
export const isAriaRequired = (el: Element): boolean => el.getAttribute('aria-required') === 'true';

/** Returns whether `aria-hidden="true"` is set on the element. */
export const isAriaHidden = (el: Element): boolean => el.getAttribute('aria-hidden') === 'true';

/** Returns the `aria-label` string attribute, or null. */
export const getAriaLabel = (el: Element): null | string => el.getAttribute('aria-label');

/** Returns the `aria-labelledby` attribute value (space-separated IDs), or null. */
export const getAriaLabelledBy = (el: Element): null | string => el.getAttribute('aria-labelledby');

/** Returns the `aria-describedby` attribute value (space-separated IDs), or null. */
export const getAriaDescribedBy = (el: Element): null | string => el.getAttribute('aria-describedby');

/** Returns the `aria-controls` attribute value, or null. */
export const getAriaControls = (el: Element): null | string => el.getAttribute('aria-controls');

/** Returns the `role` attribute value, or null. */
export const getRole = (el: Element): null | string => el.getAttribute('role');

// ── DOM query helpers ─────────────────────────────────────────────────────────

/**
 * Queries the shadow root of a custom element for a matching CSS selector.
 * Returns null if the element has no shadow root or no match is found.
 */
export const queryInShadow = <T extends Element = Element>(host: Element, selector: string): null | T => {
  return host.shadowRoot?.querySelector<T>(selector) ?? null;
};

/**
 * Queries all matching elements inside the shadow root of a custom element.
 * Returns an empty array if the element has no shadow root.
 */
export const queryAllInShadow = <T extends Element = Element>(host: Element, selector: string): T[] => {
  return Array.from(host.shadowRoot?.querySelectorAll<T>(selector) ?? []);
};

/**
 * Queries a shadow DOM element by its CSS `part` attribute.
 * Shorthand for `queryInShadow(host, '[part="name"]')`.
 *
 * @example
 * ```ts
 * const btn = queryPart(carousel, 'prev-btn');
 * expect(btn).not.toBeNull();
 * ```
 */
export const queryPart = <T extends Element = Element>(host: Element, part: string): null | T =>
  queryInShadow<T>(host, `[part="${part}"]`);

/**
 * Returns an array of light-DOM children assigned to a named slot,
 * or all slotted children if no name is given.
 *
 * @example
 * ```ts
 * const slides = getSlotted(carousel);
 * expect(slides).toHaveLength(3);
 * ```
 */
export const getSlotted = (host: Element, slotName?: string): Element[] => {
  const selector = slotName ? `[slot="${slotName}"]` : ':not([slot])';

  return Array.from(host.querySelectorAll(`:scope > ${selector}`));
};

/**
 * Dispatches a `PointerEvent` on the given element.
 * Useful for testing hover, drag, and pointer interactions without
 * relying on the fire helper from @vielzeug/ore/testing.
 *
 * @example
 * ```ts
 * dispatchPointer(el, 'enter');
 * dispatchPointer(el, 'leave');
 * ```
 */
export const dispatchPointer = (
  el: Element,
  type: 'cancel' | 'down' | 'enter' | 'leave' | 'move' | 'up',
  init?: PointerEventInit,
): void => {
  el.dispatchEvent(new PointerEvent(`pointer${type}`, { bubbles: true, composed: true, ...init }));
};

// ── Form-associated component helpers ─────────────────────────────────────────

/**
 * Returns the current form value of a form-associated custom element.
 * Uses the ElementInternals-exposed `value` if available, then falls back
 * to the reflected DOM `value` property.
 */
export const getFormValue = (el: HTMLElement & { value?: string }): null | string => {
  return el.value ?? null;
};

/**
 * Returns whether a form-associated element is considered valid (no constraint
 * violations reported by the browser or via `setValidity`).
 */
export const isFormValid = (el: HTMLElement & { validity?: ValidityState }): boolean => {
  return el.validity?.valid ?? true;
};

// ── Event helpers ─────────────────────────────────────────────────────────────

/**
 * Creates a synthetic `KeyboardEvent` with the given key.
 * Useful for testing keyboard navigation in headless controls.
 */
export const keyEvent = (key: string, init?: KeyboardEventInit): KeyboardEvent => {
  return new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init });
};

/**
 * Returns a Promise that resolves after a microtask tick (one `queueMicrotask`).
 * Use when you need to wait for reactivity (signal effects) to settle without
 * moving into the macrotask queue.
 */
export const nextTick = (): Promise<void> =>
  new Promise((resolve) => {
    queueMicrotask(resolve);
  });

/**
 * Returns a Promise that resolves after `ms` milliseconds.
 * Use sparingly — prefer `nextTick()` for reactive updates.
 */
export const wait = (ms = 0): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// ── ID counter ────────────────────────────────────────────────────────────────

/**
 * Resets the headless ID counter to 0. Use in test `beforeEach` hooks when you need
 * deterministic IDs across test runs.
 *
 * @example
 * ```ts
 * import { resetIdCounter } from '@vielzeug/refine/testing';
 * beforeEach(() => resetIdCounter());
 * ```
 */
export { resetIdCounter } from '@vielzeug/ore';

// ── ARIA snapshot helper ───────────────────────────────────────────────────────

/**
 * Returns a snapshot of the most commonly tested ARIA attributes on an element.
 * Useful for concise inline snapshot assertions in component tests.
 *
 * `ariaLabel` and `labelledby` are kept separate because `aria-label` is a
 * direct string while `aria-labelledby` is an ID reference — conflating them
 * masks bugs where the wrong labelling mechanism is used.
 *
 * @example
 * ```ts
 * expect(getAriaState(input)).toMatchObject({ invalid: 'true', required: 'true' });
 * ```
 */
export const getAriaState = (
  el: Element,
): {
  ariaLabel: null | string;
  checked: null | string;
  disabled: null | string;
  expanded: null | string;
  invalid: null | string;
  labelledby: null | string;
  required: null | string;
  role: null | string;
} => ({
  ariaLabel: el.getAttribute('aria-label'),
  checked: el.getAttribute('aria-checked'),
  disabled: el.getAttribute('aria-disabled'),
  expanded: el.getAttribute('aria-expanded'),
  invalid: el.getAttribute('aria-invalid'),
  labelledby: el.getAttribute('aria-labelledby'),
  required: el.getAttribute('aria-required'),
  role: el.getAttribute('role'),
});

// ── Typed component mount wrappers (F3) ───────────────────────────────────────

import type { Fixture } from '@vielzeug/ore/testing';

import { mount } from '@vielzeug/ore/testing';

import type { OreButtonGroupProps } from '../inputs/button-group/button-group';
import type { OreButtonProps } from '../inputs/button/button';
import type { OreCheckboxGroupProps } from '../inputs/checkbox-group/checkbox-group';
import type { OreCheckboxProps } from '../inputs/checkbox/checkbox';
import type { OreComboboxProps } from '../inputs/combobox/combobox.types';
import type { OreFileInputProps } from '../inputs/file-input/file-input';
import type { OreFormProps } from '../inputs/form/form';
import type { OreInputProps } from '../inputs/input/input';
import type { OreNumberInputProps } from '../inputs/number-input/number-input';
import type { OreOtpInputProps } from '../inputs/otp-input/otp-input';
import type { OreRadioGroupProps } from '../inputs/radio-group/radio-group';
import type { OreRadioProps } from '../inputs/radio/radio';
import type { OreRatingProps } from '../inputs/rating/rating';
import type { OreSelectProps } from '../inputs/select/select';
import type { OreSliderProps } from '../inputs/slider/slider';
import type { OreSwitchProps } from '../inputs/switch/switch';
import type { OreTextareaProps } from '../inputs/textarea/textarea';

/**
 * Serializes an attribute map to an HTML attribute string fragment.
 * Values are HTML-escaped to prevent attribute injection.
 *
 * @example
 * ```ts
 * attrsToHtml({ disabled: '', label: 'Name' }); // → 'disabled label="Name"'
 * ```
 */
export const attrsToHtml = (attrs: Record<string, string>): string =>
  Object.entries(attrs)
    .map(([key, value]) => (value === '' ? key : `${key}="${value.replace(/"/g, '&quot;')}"`))
    .join(' ');

/**
 * Converts a props object into an HTML attribute record.
 * - `true` → empty boolean attribute (e.g., `disabled`)
 * - `false` / `null` / `undefined` → attribute omitted
 * - Array of objects → **omitted** (cannot be serialized as an HTML attribute;
 *   use `opts.innerHTML` with slotted elements instead)
 * - Array of primitives → comma-joined string
 * - everything else → stringified
 *
 * @example
 * ```ts
 * propsToAttrs({ disabled: true, label: 'Name', value: undefined });
 * // → { disabled: '', label: 'Name' }
 * ```
 */
export const propsToAttrs = (props: Record<string, unknown> = {}): Record<string, string> => {
  const attrs: Record<string, string> = {};

  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null) continue;

    if (value === true) {
      attrs[key] = '';
    } else if (Array.isArray(value)) {
      // Object arrays cannot be represented as HTML attributes — skip silently.
      if (value.length > 0 && typeof value[0] === 'object') continue;

      attrs[key] = (value as string[]).join(',');
    } else {
      attrs[key] = String(value);
    }
  }

  return attrs;
};

type MountOptions = { innerHTML?: string };

/** Typed mount wrapper for `<ore-input>`. Catch prop name typos at compile time. */
export const mountOreInput = (props?: Partial<OreInputProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-input ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-input>`);

/** Typed mount wrapper for `<ore-textarea>`. */
export const mountOreTextarea = (props?: Partial<OreTextareaProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-textarea ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-textarea>`);

/** Typed mount wrapper for `<ore-select>`. */
export const mountOreSelect = (props?: Partial<OreSelectProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-select ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-select>`);

/** Typed mount wrapper for `<ore-combobox>`. */
export const mountOreCombobox = (props?: Partial<OreComboboxProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-combobox ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-combobox>`);

/** Typed mount wrapper for `<ore-checkbox>`. */
export const mountOreCheckbox = (props?: Partial<OreCheckboxProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-checkbox ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-checkbox>`);

/** Typed mount wrapper for `<ore-checkbox-group>`. */
export const mountOreCheckboxGroup = (props?: Partial<OreCheckboxGroupProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-checkbox-group ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-checkbox-group>`);

/** Typed mount wrapper for `<ore-radio>`. */
export const mountOreRadio = (props?: Partial<OreRadioProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-radio ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-radio>`);

/** Typed mount wrapper for `<ore-radio-group>`. */
export const mountOreRadioGroup = (props?: Partial<OreRadioGroupProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-radio-group ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-radio-group>`);

/** Typed mount wrapper for `<ore-switch>`. */
export const mountOreSwitch = (props?: Partial<OreSwitchProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-switch ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-switch>`);

/** Typed mount wrapper for `<ore-button>`. */
export const mountOreButton = (props?: Partial<OreButtonProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-button ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-button>`);

/** Typed mount wrapper for `<ore-button-group>`. */
export const mountOreButtonGroup = (props?: Partial<OreButtonGroupProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-button-group ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-button-group>`);

/** Typed mount wrapper for `<ore-file-input>`. */
export const mountOreFileInput = (props?: Partial<OreFileInputProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-file-input ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-file-input>`);

/** Typed mount wrapper for `<ore-form>`. */
export const mountOreForm = (props?: Partial<OreFormProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-form ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-form>`);

/** Typed mount wrapper for `<ore-number-input>`. */
export const mountOreNumberInput = (props?: Partial<OreNumberInputProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-number-input ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-number-input>`);

/** Typed mount wrapper for `<ore-otp-input>`. */
export const mountOreOtpInput = (props?: Partial<OreOtpInputProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-otp-input ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-otp-input>`);

/** Typed mount wrapper for `<ore-rating>`. */
export const mountOreRating = (props?: Partial<OreRatingProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-rating ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-rating>`);

/** Typed mount wrapper for `<ore-slider>`. */
export const mountOreSlider = (props?: Partial<OreSliderProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<ore-slider ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</ore-slider>`);
