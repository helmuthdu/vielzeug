import { effect } from '@vielzeug/stateit';

// ── A11y Host ─────────────────────────────────────────────────────────────────
//
// Declarative reactive manager that keeps ARIA attributes, HTML attributes,
// and DOM properties in sync with signal-driven getter functions. Combines
// everything into a single effect for minimal reactive overhead.
//
// Usage:
// ```ts
// const { stop } = createA11yHost(host.el, {
//   aria: {
//     'aria-expanded': () => isOpen.value ? 'true' : 'false',
//     'aria-controls': () => listboxId,
//     'aria-disabled': () => disabled.value ? 'true' : null,
//   },
//   attrs: {
//     'data-open': () => isOpen.value ? '' : null,
//   },
//   props: {
//     tabIndex: () => disabled.value ? -1 : 0,
//   },
//   signal,
// });
// ```

/** Getter map for string-valued HTML attributes. Return `null` or `undefined` to remove the attribute. */
export type AttrGetterMap = Record<string, () => string | null | undefined>;

/** Getter map for DOM properties. Any value type is supported. */
export type PropGetterMap = Record<string, () => unknown>;

export type A11yHostOptions = {
  /** Reactive `aria-*` attribute getters. Rendered under the same effect as `attrs`. */
  aria?: AttrGetterMap;
  /** Reactive non-ARIA attribute getters (e.g. `data-open`, `tabindex`). */
  attrs?: AttrGetterMap;
  /** Reactive DOM property setters (e.g. `tabIndex`, `value`, `indeterminate`). */
  props?: PropGetterMap;
  /** Optional lifecycle signal — stops all sync effects automatically when aborted. */
  signal?: AbortSignal;
};

export type A11yHost = {
  /** Stops all reactive attribute and property sync effects. */
  stop: () => void;
};

/**
 * Creates a reactive manager that keeps a set of ARIA attributes, HTML
 * attributes, and DOM properties in sync with signal-driven getter functions.
 *
 * All getters run in a single `effect` — attribute and property reads are
 * automatically tracked. When any tracked signal changes, the effect re-runs
 * and the DOM is updated.
 *
 * Pass `signal` for automatic teardown, or call `stop()` manually.
 *
 * @example
 * ```ts
 * const { stop } = createA11yHost(host.el, {
 *   aria: {
 *     'aria-checked': () => checked.value ? 'true' : 'false',
 *     'aria-disabled': () => disabled.value ? 'true' : null,
 *   },
 *   props: { tabIndex: () => disabled.value ? -1 : 0 },
 *   signal,
 * });
 * ```
 */
export const createA11yHost = (element: Element, options: A11yHostOptions): A11yHost => {
  const attrEntries = [
    ...Object.entries(options.aria ?? {}),
    ...Object.entries(options.attrs ?? {}),
  ] as [string, () => string | null | undefined][];

  const propEntries = Object.entries(options.props ?? {}) as [string, () => unknown][];

  const stop = effect(() => {
    for (const [attr, getter] of attrEntries) {
      const value = getter();

      if (value != null) {
        element.setAttribute(attr, value);
      } else {
        element.removeAttribute(attr);
      }
    }

    for (const [prop, getter] of propEntries) {
      (element as unknown as Record<string, unknown>)[prop] = getter();
    }
  });

  options.signal?.addEventListener('abort', stop, { once: true });

  return { stop };
};
