import { effect } from '@vielzeug/ripple';

// ── Reactive Bindings ─────────────────────────────────────────────────────────
//
// Declarative reactive manager that keeps ARIA attributes, HTML attributes,
// and DOM properties in sync with signals. Combines everything into a single
// effect for minimal reactive overhead.
//
// Values can be static (resolved once, no tracking) or reactive getter functions
// (re-evaluated on every effect run, tracking their signal reads automatically).
//
// Usage:
// ```ts
// const { stop } = createReactiveBindings(el, {
//   aria: {
//     'aria-expanded': () => isOpen.value ? 'true' : 'false',
//     'aria-controls': listboxId,          // static — set once
//     'aria-disabled': () => disabled.value ? 'true' : null,
//   },
//   attrs: {
//     'data-open': () => isOpen.value ? '' : null,
//   },
//   props: {
//     tabIndex: () => disabled.value ? -1 : 0,
//   },
//   run: () => {
//     // extra reactive side-effects in the same effect
//   },
//   signal,
// });
// ```

/**
 * An attribute value: a static string/null/undefined, or a reactive getter
 * function. Return `null` or `undefined` to remove the attribute.
 */
export type AttrValue = string | null | undefined | (() => string | null | undefined);

/**
 * A DOM property value: a static value, or a reactive getter function.
 * A function is treated as a getter — if you need to set a function as an actual
 * property value, wrap it: `() => myFn`.
 */
export type PropValue = unknown | (() => unknown);

/** Map of attribute names to static values or reactive getter functions. */
export type AttrMap = Record<string, AttrValue>;

/** Map of DOM property names to static values or reactive getter functions. */
export type PropMap = Record<string, PropValue>;

export type ReactiveBindingsOptions = {
  /** Reactive or static `aria-*` attribute values. Rendered in the same effect as `attrs`. */
  aria?: AttrMap;
  /** Reactive or static non-ARIA attribute values (e.g. `data-open`, `tabindex`). */
  attrs?: AttrMap;
  /** Reactive or static DOM property values (e.g. `tabIndex`, `value`, `indeterminate`). */
  props?: PropMap;
  /**
   * Optional extra side-effects to run inside the same reactive effect as the
   * attribute/property sync. Useful for stamping IDs or any other DOM mutation
   * that should re-run when the same signals change.
   */
  run?: () => void;
  /** Optional lifecycle signal — stops all sync effects automatically when aborted. */
  signal?: AbortSignal;
};

/** @deprecated Use `ReactiveBindingsOptions` */
export type A11yHostOptions = ReactiveBindingsOptions;

export type ReactiveBindings = {
  /** Stops all reactive attribute and property sync effects. */
  stop: () => void;
};

/** @deprecated Use `ReactiveBindings` */
export type A11yHost = ReactiveBindings;

const resolveAttr = (value: AttrValue): string | null | undefined => (typeof value === 'function' ? value() : value);

const resolveProp = (value: PropValue): unknown => (typeof value === 'function' ? value() : value);

/**
 * Creates a reactive manager that keeps a set of ARIA attributes, HTML
 * attributes, and DOM properties in sync with signals.
 *
 * All getters run in a single `effect` — attribute and property reads are
 * automatically tracked. When any tracked signal changes, the effect re-runs
 * and the DOM is updated. Static values are applied on the first run only.
 *
 * Pass `signal` for automatic teardown, or call `stop()` manually.
 *
 * @example
 * ```ts
 * const { stop } = createReactiveBindings(el, {
 *   aria: {
 *     'aria-checked': () => checked.value ? 'true' : 'false',
 *     'aria-controls': listboxId,   // static
 *     'aria-disabled': () => disabled.value ? 'true' : null,
 *   },
 *   props: { tabIndex: () => disabled.value ? -1 : 0 },
 *   signal,
 * });
 * ```
 */
export const createReactiveBindings = (element: Element, options: ReactiveBindingsOptions): ReactiveBindings => {
  const attrEntries = [...Object.entries(options.aria ?? {}), ...Object.entries(options.attrs ?? {})] as [
    string,
    AttrValue,
  ][];

  const propEntries = Object.entries(options.props ?? {}) as [string, PropValue][];

  const sub = effect(() => {
    for (const [attr, value] of attrEntries) {
      const resolved = resolveAttr(value);

      if (resolved != null) {
        element.setAttribute(attr, resolved);
      } else {
        element.removeAttribute(attr);
      }
    }

    for (const [prop, value] of propEntries) {
      (element as unknown as Record<string, unknown>)[prop] = resolveProp(value);
    }

    options.run?.();
  });

  const stop = () => sub.dispose();

  options.signal?.addEventListener('abort', stop, { once: true });

  return { stop };
};

/** @deprecated Use `createReactiveBindings` */
export const createA11yHost = createReactiveBindings;
