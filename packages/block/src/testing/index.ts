/**
 * /block/testing
 *
 * Testing utilities for block components. Provides a11y helpers, ARIA query
 * utilities, and convenience wrappers for common patterns in component tests.
 *
 * @example
 * ```typescript
 * import { getAriaLabel, getAriaDescribedBy, isAriaInvalid } from '@vielzeug/block/testing';
 * import { mount } from '@vielzeug/craft/testing';
 *
 * const fixture = mount('<bit-input label="Name"></bit-input>');
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
