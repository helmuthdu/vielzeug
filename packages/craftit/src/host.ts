/**
 * Host utilities — component context injection, slot observation, and attribute/class reflection.
 *
 * - Context API (provide, inject, createContext, syncContextProps)
 * - Slot observation and detection (setup slots)
 * - Host element binding (reflect) for attributes, classes, and host listeners
 */

import { type ReadonlySignal, type Signal, isSignal, signal } from '@vielzeug/stateit';

import { listen, setAttr } from './internal';
import { currentRuntime, effect, onCleanup, onMount, type HostEventListeners } from './runtime';

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT API
// ─────────────────────────────────────────────────────────────────────────────

const contextRegistry = new WeakMap<HTMLElement, Map<InjectionKey<unknown> | string | symbol, unknown>>();
const hostPropBindingOwners = new WeakMap<HTMLElement, Map<string, symbol>>();

export type InjectionKey<T> = symbol & {
  readonly __craftit_injection_key?: T;
};

export const provide = <T>(key: InjectionKey<T> | string | symbol, value: T): void => {
  const el = currentRuntime().el;

  if (!contextRegistry.has(el)) contextRegistry.set(el, new Map());

  contextRegistry.get(el)!.set(key, value);
};

export function inject<T>(key: InjectionKey<T> | string | symbol): T | undefined;
export function inject<T>(key: InjectionKey<T> | string | symbol, fallback: T): T;
export function inject<T>(key: InjectionKey<T> | string | symbol, ...rest: [T?]): T | undefined {
  let node: Node | null = currentRuntime().el;

  while (node) {
    if (node instanceof HTMLElement) {
      const v = contextRegistry.get(node)?.get(key);

      if (v !== undefined) return v as T;
    }

    const root = node.getRootNode() as Node;

    node = (node as HTMLElement).parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }

  return rest.length > 0 ? rest[0] : undefined;
}

export const injectStrict = <T>(key: InjectionKey<T> | string | symbol): T => {
  const resolved = inject<T>(key);

  if (resolved !== undefined) return resolved;

  const host = currentRuntime().el;

  throw new Error(`[craftit:E11] injectStrict(...) failed for key "${String(key)}" in <${host.localName}>`);
};

export function createContext<T>(description?: string): InjectionKey<T> {
  return Symbol(description) as InjectionKey<T>;
}

/**
 * Reactively inherits prop values from a context object provided by an ancestor component.
 * For each key, when the context value is not `undefined`, it is written into the matching prop signal.
 * The effect is automatically cleaned up when the component unmounts.
 *
 * Deferred to `onMount` so context values win over HTML attribute values set on the child.
 *
 * @example
 * syncContextProps(inject(BUTTON_GROUP_CTX), props);
 */
export const syncContextProps = <Ctx extends Record<string, unknown>, Props extends Record<string, Signal<unknown>>>(
  ctx: Ctx | undefined,
  props: Props,
): void => {
  if (!ctx) return;

  onMount(() => {
    effect(() => {
      for (const k of Object.keys(ctx)) {
        const source = (ctx as any)[k];

        if (!isSignal(source)) continue;

        const v = source.value;
        const target = props[k];

        if (v !== undefined && target) target.value = v;
      }
    });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// ARIA SYNC
// ─────────────────────────────────────────────────────────────────────────────

type AriaValue = string | number | boolean | null | undefined | (() => string | number | boolean | null | undefined);

type AriaConfig = Record<string, AriaValue>;

const normalizeAriaKey = (key: string): string => {
  if (key === 'role' || key.startsWith('aria-')) return key;

  return key.startsWith('aria') ? `aria-${key.slice(4).toLowerCase()}` : `aria-${key}`;
};

const setA11yAttr = (target: Element, key: string, value: string | number | boolean | null | undefined): void => {
  if (value == null || value === false) {
    target.removeAttribute(key);

    return;
  }

  target.setAttribute(key, value === true ? 'true' : String(value));
};

/**
 * Reactively syncs ARIA attributes to a target element.
 * Static values are set immediately; getter functions are tracked as effects.
 * Returns a cleanup function that removes all reactive bindings.
 *
 * @example
 * syncAria(element, {
 *   role: 'button',
 *   expanded: () => isOpen.value,
 *   disabled: () => isDisabled.value,
 * });
 */
export const syncAria = (target: Element, config: AriaConfig): (() => void) => {
  const disposers: Array<() => void> = [];

  for (const [rawKey, rawValue] of Object.entries(config)) {
    const key = normalizeAriaKey(rawKey);

    if (typeof rawValue === 'function') {
      disposers.push(effect(() => setA11yAttr(target, key, rawValue())));
    } else {
      setA11yAttr(target, key, rawValue);
    }
  }

  return () => {
    while (disposers.length > 0) disposers.pop()?.();
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SLOTS API
// ─────────────────────────────────────────────────────────────────────────────

const SLOT_DEFAULT = 'default';
const normalizeSlotName = (slotName: string | null | undefined): string => slotName || SLOT_DEFAULT;

export type ComponentSlots = {
  elements: (name?: string) => ReadonlySignal<Element[]>;
  has: (name?: string) => ReadonlySignal<boolean>;
};

/**
 * Creates first-class slot signals for setup context.
 *
 * - `slots.has(name?)`: whether a slot has assigned elements
 * - `slots.elements(name?)`: assigned elements for a slot (flattened)
 */
export const createSlots = (): ComponentSlots => {
  const host = currentRuntime().el;

  const presenceSignals = new Map<string, Signal<boolean>>();
  const elementSignals = new Map<string, Signal<Element[]>>();
  const slotNodesByName = new Map<string, Set<HTMLSlotElement>>();
  const slotCleanupMap = new Map<HTMLSlotElement, () => void>();

  const ensurePresenceSignal = (name: string): Signal<boolean> => {
    const normalized = normalizeSlotName(name);
    let s = presenceSignals.get(normalized);

    if (!s) {
      s = signal(false);
      presenceSignals.set(normalized, s);
    }

    return s;
  };

  const ensureElementSignal = (name: string): Signal<Element[]> => {
    const normalized = normalizeSlotName(name);
    let s = elementSignals.get(normalized);

    if (!s) {
      s = signal<Element[]>([]);
      elementSignals.set(normalized, s);
    }

    return s;
  };

  const recomputeSlot = (name: string): void => {
    const normalized = normalizeSlotName(name);
    const slotsForName = slotNodesByName.get(normalized);
    const assigned: Element[] = [];

    if (slotsForName) {
      for (const slotEl of slotsForName) {
        assigned.push(...slotEl.assignedElements({ flatten: true }));
      }
    }

    ensureElementSignal(normalized).value = assigned;
    ensurePresenceSignal(normalized).value = assigned.length > 0;
  };

  const bindSlot = (slotEl: HTMLSlotElement): void => {
    if (slotCleanupMap.has(slotEl)) return;

    const name = normalizeSlotName(slotEl.getAttribute('name'));
    const setForName = slotNodesByName.get(name) ?? new Set<HTMLSlotElement>();

    setForName.add(slotEl);
    slotNodesByName.set(name, setForName);

    const onChange = () => recomputeSlot(name);

    slotEl.addEventListener('slotchange', onChange);

    slotCleanupMap.set(slotEl, () => {
      slotEl.removeEventListener('slotchange', onChange);
    });

    recomputeSlot(name);
  };

  const bindAllSlots = (): void => {
    host.shadowRoot?.querySelectorAll('slot').forEach((slotEl) => bindSlot(slotEl));
  };

  const recomputeAllSlots = (): void => {
    for (const name of slotNodesByName.keys()) {
      recomputeSlot(name);
    }
  };

  ensurePresenceSignal(SLOT_DEFAULT);
  ensureElementSignal(SLOT_DEFAULT);

  // setup() runs before the template is rendered, so bind once now (if any slots
  // already exist) and again on mount after shadow DOM content has been stamped.
  bindAllSlots();

  onMount(() => {
    bindAllSlots();
    recomputeAllSlots();
  });

  onCleanup(() => {
    for (const cleanup of slotCleanupMap.values()) cleanup();

    slotCleanupMap.clear();
    slotNodesByName.clear();
  });

  const slots: ComponentSlots = {
    elements: (name?: string) => ensureElementSignal(normalizeSlotName(name)),
    has: (name?: string) => ensurePresenceSignal(normalizeSlotName(name)),
  };

  return slots;
};

// ─────────────────────────────────────────────────────────────────────────────
// REFLECT API (HOST ATTRIBUTE/EVENT/CLASS BINDING)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Describes a reactive or static host binding value.
 */
export type HostBindingValue =
  | (() => string | number | boolean | null | undefined)
  | ReadonlySignal<string | number | boolean | null | undefined>
  | string
  | number
  | boolean
  | null
  | undefined;

/**
 * Configuration for host attribute bindings.
 */
export type ReflectConfig = Record<string, HostBindingValue>;

/**
 * Describes a reactive property accessor binding on the host element.
 * The getter is called lazily; the optional setter is used when external code
 * assigns `element.propName = value`.
 */
export type HostPropDescriptor<T = unknown> = {
  get: () => T;
  set?: (value: T) => void;
};

type HostClassBindingValue = ReadonlySignal<boolean> | (() => boolean) | boolean;

export type HostBindConfig<CustomEvents extends Record<string, unknown> = Record<string, never>> = {
  attr?: ReflectConfig;
  class?: (() => Record<string, boolean>) | Record<string, HostClassBindingValue>;
  on?: HostEventListeners<CustomEvents>;
  prop?: Record<string, HostPropDescriptor>;
  style?: Record<string, HostBindingValue>;
};

export type ComponentHost = {
  bind: <CustomEvents extends Record<string, unknown> = Record<string, never>>(
    config: HostBindConfig<CustomEvents>,
    options?: AddEventListenerOptions,
  ) => () => void;
  el: HTMLElement;
};

export const createHost = (): ComponentHost => {
  const el = currentRuntime().el;

  const host: ComponentHost = {
    bind: (config, options) => {
      const disposers: Array<() => void> = [];

      if (config.attr) {
        for (const [key, value] of Object.entries(config.attr)) {
          const name =
            key.startsWith('aria-') || key === 'role'
              ? key
              : key.startsWith('aria')
                ? `aria-${key.slice(4).toLowerCase()}`
                : key;
          const dispose = applyAttribute(el, name, value);

          if (dispose) disposers.push(dispose);
        }
      }

      if (config.class) {
        disposers.push(applyClassMap(el, config.class));
      }

      if (config.prop) {
        const propOwners = hostPropBindingOwners.get(el) ?? new Map<string, symbol>();

        if (!hostPropBindingOwners.has(el)) hostPropBindingOwners.set(el, propOwners);

        for (const [key, descriptor] of Object.entries(config.prop)) {
          const { get, set } = descriptor;
          const ownerToken = Symbol(key);

          propOwners.set(key, ownerToken);

          Object.defineProperty(el, key, {
            configurable: true,
            enumerable: true,
            get,
            ...(set ? { set } : {}),
          });

          disposers.push(() => {
            if (propOwners.get(key) !== ownerToken) return;

            propOwners.delete(key);
            delete (el as unknown as Record<string, unknown>)[key];

            if (propOwners.size === 0) hostPropBindingOwners.delete(el);
          });
        }
      }

      if (config.on) {
        for (const event of Object.keys(config.on) as Array<keyof typeof config.on>) {
          const listener = config.on[event];

          if (!listener) continue;

          disposers.push(listen(el, event as string, listener as EventListener, options));
        }
      }

      if (config.style) {
        for (const [key, value] of Object.entries(config.style)) {
          const dispose = applyStyle(el, key, value);

          if (dispose) disposers.push(dispose);
        }
      }

      const cleanup = () => {
        while (disposers.length > 0) disposers.pop()?.();
      };

      onCleanup(cleanup);

      return cleanup;
    },
    el,
  };

  return host;
};

const applyReactiveBinding = (
  value: HostBindingValue,
  updater: (next: string | number | boolean | null | undefined) => void,
): (() => void) | void => {
  if (typeof value === 'function') {
    return effect(() => updater(value()));
  }

  if (isSignal(value)) {
    return effect(() => updater(value.value));
  }

  updater(value);
};

function applyAttribute(host: HTMLElement, name: string, value: HostBindingValue): (() => void) | void {
  return applyReactiveBinding(value, (next) => setAttr(host, name, next));
}

function applyStyle(host: HTMLElement, name: string, value: HostBindingValue): (() => void) | void {
  const setStyle = (v: any) => {
    if (v != null) host.style.setProperty(name, String(v));
    else host.style.removeProperty(name);
  };

  return applyReactiveBinding(value, setStyle);
}

function applyClassMap(
  host: HTMLElement,
  value: (() => Record<string, boolean>) | Record<string, HostClassBindingValue>,
): () => void {
  const getMap =
    typeof value === 'function'
      ? value
      : (): Record<string, boolean> => {
          const result: Record<string, boolean> = {};

          for (const [cls, entry] of Object.entries(value)) {
            result[cls] = typeof entry === 'function' ? entry() : isSignal(entry) ? entry.value : Boolean(entry);
          }

          return result;
        };

  let prev = new Set<string>();

  return effect(() => {
    const next = new Set<string>();

    for (const [cls, active] of Object.entries(getMap())) {
      if (!active) continue;

      next.add(cls);

      if (!prev.has(cls)) host.classList.add(cls);
    }

    for (const cls of prev) {
      if (!next.has(cls)) host.classList.remove(cls);
    }

    prev = next;
  });
}
