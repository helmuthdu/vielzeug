/**
 * Host utilities — component context injection, slot observation, and attribute/class reflection.
 *
 * This module consolidates:
 * - Context API (provide, inject, createContext, syncContextProps)
 * - Slot observation and detection (Slots type, createSlots, onSlotChange)
 * - Host element binding (reflect) for attributes, events, and classes
 */

import { type ReadonlySignal, type Signal, signal, effect } from '@vielzeug/stateit';

import { currentRuntime, onCleanup, onMount, runtimeStack, handle } from './runtime-lifecycle';
import { setAttr } from './utilities';

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT API
// ─────────────────────────────────────────────────────────────────────────────

// ─── Context registry ─────────────────────────────────────────────────────────
const contextRegistry = new WeakMap<HTMLElement, Map<InjectionKey<unknown> | string | symbol, unknown>>();

export type InjectionKey<T> = symbol & {
  readonly __craftit_injection_key?: T;
};

/** Sentinel used to distinguish "argument not passed" from `undefined` in overloaded functions. */
const _UNSET = Symbol('craftit.unset');

export const provide = <T>(key: InjectionKey<T> | string | symbol, value: T): void => {
  const el = currentRuntime().el;

  if (!contextRegistry.has(el)) contextRegistry.set(el, new Map());

  contextRegistry.get(el)!.set(key, value);
};

export function inject<T>(key: InjectionKey<T> | string | symbol): T | undefined;
export function inject<T>(key: InjectionKey<T> | string | symbol, fallback: T): T;
export function inject<T>(key: InjectionKey<T> | string | symbol, fallback: T | typeof _UNSET = _UNSET): T | undefined {
  const rt = currentRuntime();
  let node: Node | null = rt.el;

  while (node) {
    if (node instanceof HTMLElement) {
      const ctxMap = contextRegistry.get(node);

      if (ctxMap?.has(key)) {
        return ctxMap.get(key) as T;
      }
    }

    // Fall back to DOM traversal
    const rootNode = node.getRootNode() as Node;
    const parentElement: HTMLElement | null = (node as HTMLElement).parentElement;
    const hostElement = rootNode instanceof ShadowRoot ? rootNode.host : null;

    node = parentElement ?? hostElement ?? null;
  }

  if (fallback === _UNSET) {
    console.warn(`[craftit:E7] inject key missing: ${String(key)}`);

    return undefined;
  }

  return fallback as T;
}

export function createContext<T>(description?: string): InjectionKey<T> {
  return Symbol(description) as InjectionKey<T>;
}

/**
 * Reactively inherits prop values from a context object provided by an ancestor component.
 * For each key, when the context value is not `undefined`, it is written into the matching prop signal.
 * The effect is automatically cleaned up when the component unmounts.
 *
 * @example
 * syncContextProps(inject(BUTTON_GROUP_CTX), props, ['color', 'size', 'variant']);
 */
export const syncContextProps = <
  K extends string,
  Ctx extends Partial<Record<K, ReadonlySignal<unknown>>>,
  Props extends Record<K, Signal<unknown>>,
>(
  ctx: Ctx | undefined,
  props: Props,
  keys: K[],
): void => {
  if (!ctx) return;

  // Defer to onMount so the effect runs after craftit's own attribute→prop sync
  // (the propsKey loop in connectedCallback). This ensures context values win
  // over HTML attribute values set on the child element.
  onMount(() =>
    effect(() => {
      for (const k of keys) {
        const v = ctx[k]?.value;

        if (v !== undefined) props[k].value = v;
      }
    }),
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SLOTS API
// ─────────────────────────────────────────────────────────────────────────────

const missingSlotWarnings = new Set<string>();

const warnMissingSlot = (el: HTMLElement, slotName: string, source: 'onSlotChange()' | 'slots.has()'): void => {
  const normalizedName = slotName || 'default';
  const key = `${source}:${el.localName}:${normalizedName}`;

  if (missingSlotWarnings.has(key)) return;

  missingSlotWarnings.add(key);
  console.warn(
    `[craftit:E10] ${source} could not find a matching <slot${slotName ? ` name="${slotName}"` : ''}> in <${el.localName}>. Render the slot before using ${source}.`,
  );
};

export type Slots<T extends Record<string, unknown> = Record<string, unknown>> = {
  /**
   * Returns a `ReadonlySignal<boolean>` that is `true` when the slot has assigned content.
   * Reactive — use the returned signal directly in computed(), html templates, or effects.
   * @example const hasIcon = slots.has('icon'); // ReadonlySignal<boolean>
   */
  has(name: keyof T): ReadonlySignal<boolean>;
};

/**
 * Observes a named slot (or the default slot when `slotName` is `'default'` or `''`) and
 * calls `callback` with the list of assigned elements whenever the slot's children change.
 *
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   onSlotChange('default', (nodes) => {
 *     console.log('Default slot has', nodes.length, 'elements');
 *   });
 *   onSlotChange('icon', (nodes) => setHasIcon(nodes.length > 0));
 * });
 */
export const onSlotChange = (slotName: string, callback: (elements: Element[]) => void): void => {
  const el = currentRuntime().el;
  const name = slotName === 'default' ? '' : slotName;
  const selector = name ? `slot[name="${name}"]` : 'slot:not([name])';
  const slot = el.shadowRoot?.querySelector<HTMLSlotElement>(selector);

  if (!slot) {
    warnMissingSlot(el, name, 'onSlotChange()');

    return;
  }

  const handler = () => callback(slot.assignedElements({ flatten: true }));

  handler(); // run immediately with current content
  slot.addEventListener('slotchange', handler);
  onCleanup(() => slot.removeEventListener('slotchange', handler));
};

export const createSlots = <T extends Record<string, unknown> = Record<string, unknown>>(): Slots<T> => {
  const el = currentRuntime().el;
  const sigs = new Map<string, Signal<boolean>>();

  const setup = (slotName: string, s: Signal<boolean>): (() => void) | undefined => {
    const slot = el.shadowRoot?.querySelector<HTMLSlotElement>(
      slotName ? `slot[name="${slotName}"]` : 'slot:not([name])',
    );

    if (!slot) {
      warnMissingSlot(el, slotName, 'slots.has()');

      return;
    }

    const update = () => {
      s.value = slot.assignedNodes().length > 0;
    };

    update();
    slot.addEventListener('slotchange', update);

    return () => slot.removeEventListener('slotchange', update);
  };

  const get = (slotName: string): Signal<boolean> => {
    if (!sigs.has(slotName)) {
      const s = signal(false);

      sigs.set(slotName, s);

      // During setup shadow DOM isn't rendered yet — defer to onMount.
      // Post-mount (e.g. test access) shadow DOM is ready, set up immediately.
      if (runtimeStack.length > 0) {
        onMount(() => setup(slotName, s));
      } else {
        setup(slotName, s);
      }
    }

    return sigs.get(slotName)!;
  };

  return {
    has(name: keyof T): ReadonlySignal<boolean> {
      return get(name === 'default' ? '' : String(name));
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// REFLECT API (HOST ATTRIBUTE/EVENT/CLASS BINDING)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Describes a reactive or static host binding (attribute, event, class).
 */
export type HostBindingValue =
  | (() => string | number | boolean | null | undefined)
  | string
  | number
  | boolean
  | null
  | undefined;

type HostEventBindingValue = (e: Event) => void;

/**
 * Configuration for `reflect()`.
 */
export type ReflectConfig = {
  [key: string]: HostBindingValue | HostEventBindingValue;
  classMap?: () => Record<string, boolean>;
};

/**
 * Reflect reactive attributes, events, and classes to a host element.
 * Must be called within a component setup context.
 *
 * @example
 * setup({ host, reflect }) {
 *   reflect({
 *     role: 'checkbox',
 *     tabindex: () => disabled ? undefined : 0,
 *     checked: () => checked.value,
 *     classMap: () => ({ 'is-checked': checked.value }),
 *     onClick: handleToggle,
 *   });
 * }
 */
export function reflect(host: HTMLElement, config: ReflectConfig): void {
  for (const [key, value] of Object.entries(config)) {
    if (key === 'classMap' && typeof value === 'function') {
      applyClassMap(host, value as () => Record<string, boolean>);
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Event binding: onClick, onKeydown, etc.
      const eventName = key.slice(2).toLowerCase();

      handle(host, eventName, value as HostEventBindingValue);
    } else {
      // Attribute binding
      applyAttribute(host, key, value as HostBindingValue);
    }
  }
}

function applyAttribute(host: HTMLElement, name: string, value: HostBindingValue): void {
  const isReactive = typeof value === 'function';

  if (isReactive) {
    // Re-run whenever the getter changes
    effect(() => {
      const resolved = (value as () => HostBindingValue)();

      setAttr(host, name, resolved);
    });
  } else {
    // Static value set once
    setAttr(host, name, value);
  }
}

function applyClassMap(host: HTMLElement, getter: () => Record<string, boolean>): void {
  let lastClasses = new Set<string>();

  effect(() => {
    const classes = getter();
    const nextClasses = new Set<string>();

    for (const [name, shouldAdd] of Object.entries(classes)) {
      if (shouldAdd) {
        nextClasses.add(name);

        if (!lastClasses.has(name)) {
          host.classList.add(name);
        }
      } else {
        if (lastClasses.has(name)) {
          host.classList.remove(name);
        }
      }
    }

    // Remove classes that are no longer in the map
    for (const removed of lastClasses) {
      if (!nextClasses.has(removed)) {
        host.classList.remove(removed);
      }
    }

    lastClasses = nextClasses;
  });
}
