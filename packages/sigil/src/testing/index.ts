/**
 * @vielzeug/sigil/testing
 *
 * Testing utilities for sigil components. Provides a11y helpers, ARIA query
 * utilities, and convenience wrappers for common patterns in component tests.
 *
 * @example
 * ```typescript
 * import { getAriaLabel, getAriaDescribedBy, isAriaInvalid } from '@vielzeug/sigil/testing';
 * import { mount } from '@vielzeug/craft/testing';
 *
 * const fixture = mount('<sg-input label="Name"></sg-input>');
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
 * relying on the fire helper from @vielzeug/craft/testing.
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
 * import { resetIdCounter } from '@vielzeug/sigil/testing';
 * beforeEach(() => resetIdCounter());
 * ```
 */
export { resetIdCounter } from '@vielzeug/craft';

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

import type { Fixture } from '@vielzeug/craft/testing';

import { mount } from '@vielzeug/craft/testing';

import type { SgButtonGroupProps } from '../inputs/button-group/button-group';
import type { SgButtonProps } from '../inputs/button/button';
import type { SgCheckboxGroupProps } from '../inputs/checkbox-group/checkbox-group';
import type { SgCheckboxProps } from '../inputs/checkbox/checkbox';
import type { SgComboboxProps } from '../inputs/combobox/combobox.types';
import type { SgFileInputProps } from '../inputs/file-input/file-input';
import type { SgFormProps } from '../inputs/form/form';
import type { SgInputProps } from '../inputs/input/input';
import type { SgNumberInputProps } from '../inputs/number-input/number-input';
import type { SgOtpInputProps } from '../inputs/otp-input/otp-input';
import type { SgRadioGroupProps } from '../inputs/radio-group/radio-group';
import type { SgRadioProps } from '../inputs/radio/radio';
import type { SgRatingProps } from '../inputs/rating/rating';
import type { SgSelectProps } from '../inputs/select/select';
import type { SgSliderProps } from '../inputs/slider/slider';
import type { SgSwitchProps } from '../inputs/switch/switch';
import type { SgTextareaProps } from '../inputs/textarea/textarea';

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

/** Typed mount wrapper for `<sg-input>`. Catch prop name typos at compile time. */
export const mountSgInput = (props?: Partial<SgInputProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-input ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-input>`);

/** Typed mount wrapper for `<sg-textarea>`. */
export const mountSgTextarea = (props?: Partial<SgTextareaProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-textarea ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-textarea>`);

/** Typed mount wrapper for `<sg-select>`. */
export const mountSgSelect = (props?: Partial<SgSelectProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-select ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-select>`);

/** Typed mount wrapper for `<sg-combobox>`. */
export const mountSgCombobox = (props?: Partial<SgComboboxProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-combobox ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-combobox>`);

/** Typed mount wrapper for `<sg-checkbox>`. */
export const mountSgCheckbox = (props?: Partial<SgCheckboxProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-checkbox ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-checkbox>`);

/** Typed mount wrapper for `<sg-checkbox-group>`. */
export const mountSgCheckboxGroup = (props?: Partial<SgCheckboxGroupProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-checkbox-group ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-checkbox-group>`);

/** Typed mount wrapper for `<sg-radio>`. */
export const mountSgRadio = (props?: Partial<SgRadioProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-radio ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-radio>`);

/** Typed mount wrapper for `<sg-radio-group>`. */
export const mountSgRadioGroup = (props?: Partial<SgRadioGroupProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-radio-group ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-radio-group>`);

/** Typed mount wrapper for `<sg-switch>`. */
export const mountSgSwitch = (props?: Partial<SgSwitchProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-switch ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-switch>`);

/** Typed mount wrapper for `<sg-button>`. */
export const mountSgButton = (props?: Partial<SgButtonProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-button ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-button>`);

/** Typed mount wrapper for `<sg-button-group>`. */
export const mountSgButtonGroup = (props?: Partial<SgButtonGroupProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-button-group ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-button-group>`);

/** Typed mount wrapper for `<sg-file-input>`. */
export const mountSgFileInput = (props?: Partial<SgFileInputProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-file-input ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-file-input>`);

/** Typed mount wrapper for `<sg-form>`. */
export const mountSgForm = (props?: Partial<SgFormProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-form ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-form>`);

/** Typed mount wrapper for `<sg-number-input>`. */
export const mountSgNumberInput = (props?: Partial<SgNumberInputProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-number-input ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-number-input>`);

/** Typed mount wrapper for `<sg-otp-input>`. */
export const mountSgOtpInput = (props?: Partial<SgOtpInputProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-otp-input ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-otp-input>`);

/** Typed mount wrapper for `<sg-rating>`. */
export const mountSgRating = (props?: Partial<SgRatingProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-rating ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-rating>`);

/** Typed mount wrapper for `<sg-slider>`. */
export const mountSgSlider = (props?: Partial<SgSliderProps>, opts?: MountOptions): Promise<Fixture> =>
  mount(`<sg-slider ${attrsToHtml(propsToAttrs(props))}>${opts?.innerHTML ?? ''}</sg-slider>`);
