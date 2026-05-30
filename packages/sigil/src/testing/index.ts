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
export { resetIdCounter } from '../headless/id';

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

// ── Component setup helper ────────────────────────────────────────────────────

/**
 * Registers a component for testing by wrapping the dynamic import in a
 * `beforeAll`. The imported module is side-effectful (calls `define()`), so a
 * single import per test file is enough.
 *
 * Reduces boilerplate from:
 * ```ts
 * beforeAll(async () => { await import('./my-component'); });
 * ```
 * to:
 * ```ts
 * setupComponent(() => import('./my-component'));
 * ```
 *
 * @example
 * ```ts
 * import { setupComponent } from '@vielzeug/sigil/testing';
 *
 * setupComponent(() => import('../input'));
 *
 * it('renders the input', async () => {
 *   const fixture = mount('<bit-input></bit-input>');
 *   // ...
 * });
 * ```
 */
export const setupComponent = (importFn: () => Promise<unknown>): void => {
  beforeAll(async () => {
    await importFn();
  });
};
