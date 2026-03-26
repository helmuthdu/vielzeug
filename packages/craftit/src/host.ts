/**
 * Host utilities — component context injection, slot observation, and attribute/class reflection.
 *
 * - Context API (provide, inject, createContext, syncContextProps)
 * - Slot observation and detection (setup slots)
 * - Host element binding (reflect) for attributes, classes, and host listeners
 */

import { type ReadonlySignal, type Signal, signal } from '@vielzeug/stateit';

import { listen, setAttr } from './internal';
import { currentRuntime } from './runtime-core';
import { effect, onCleanup, onMount, type HostEventListeners } from './runtime-lifecycle';

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT API
// ─────────────────────────────────────────────────────────────────────────────

const contextRegistry = new WeakMap<HTMLElement, Map<InjectionKey<unknown> | string | symbol, unknown>>();

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

  onMount(() => {
    effect(() => {
      const target = props as Record<K, Signal<unknown>>;

      for (const k of keys) {
        const v = ctx[k]?.value;

        if (v !== undefined) target[k].value = v;
      }
    });
  });
};

export type HostContextAttributeBridge = {
  contextDisabled?: ReadonlySignal<boolean | undefined>;
  contextSize?: ReadonlySignal<string | undefined>;
  contextVariant?: ReadonlySignal<string | undefined>;
  ownDisabled?: ReadonlySignal<boolean | undefined>;
  ownSize?: ReadonlySignal<string | undefined>;
  ownVariant?: ReadonlySignal<string | undefined>;
};

export const bridgeContextAttributes = (host: HTMLElement, options: HostContextAttributeBridge): void => {
  let contextDisabledActive = false;

  effect(() => {
    const contextDisabled = Boolean(options.contextDisabled?.value);

    if (contextDisabled && !contextDisabledActive) {
      host.setAttribute('disabled', '');
      contextDisabledActive = true;
    } else if (!contextDisabled && contextDisabledActive && !options.ownDisabled?.value) {
      host.removeAttribute('disabled');
      contextDisabledActive = false;
    }

    const contextSize = options.contextSize?.value;
    const hasOwnSize = Boolean(options.ownSize?.value);

    if (contextSize && !hasOwnSize) host.setAttribute('size', contextSize);
    else if (!hasOwnSize) host.removeAttribute('size');

    const contextVariant = options.contextVariant?.value;
    const hasOwnVariant = Boolean(options.ownVariant?.value);

    if (contextVariant && !hasOwnVariant) host.setAttribute('variant', contextVariant);
    else if (!hasOwnVariant) host.removeAttribute('variant');
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SLOTS API
// ─────────────────────────────────────────────────────────────────────────────

const SLOT_DEFAULT = 'default';
const normalizeSlotName = (slotName: string | null | undefined): string => {
  if (!slotName || slotName === SLOT_DEFAULT) return SLOT_DEFAULT;

  return slotName;
};

const slotsRegistry = new WeakMap<HTMLElement, ComponentSlots>();

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
  const cached = slotsRegistry.get(host);

  if (cached) return cached;

  const presenceSignals = new Map<string, Signal<boolean>>();
  const elementSignals = new Map<string, Signal<Element[]>>();
  const slotNodesByName = new Map<string, Set<HTMLSlotElement>>();
  const slotCleanupMap = new Map<HTMLSlotElement, () => void>();
  let isDisposing = false;

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

    const cleanup = () => {
      slotEl.removeEventListener('slotchange', onChange);
      slotCleanupMap.delete(slotEl);

      if (isDisposing) return;

      const currentSet = slotNodesByName.get(name);

      if (!currentSet) return;

      currentSet.delete(slotEl);

      if (currentSet.size === 0) {
        slotNodesByName.delete(name);
      }

      recomputeSlot(name);
    };

    slotCleanupMap.set(slotEl, cleanup);

    recomputeSlot(name);
  };

  const unbindSlot = (slotEl: HTMLSlotElement): void => {
    slotCleanupMap.get(slotEl)?.();
  };

  const bindAllSlots = (): void => {
    host.shadowRoot?.querySelectorAll('slot').forEach((slotEl) => bindSlot(slotEl));
  };

  ensurePresenceSignal(SLOT_DEFAULT);
  ensureElementSignal(SLOT_DEFAULT);

  bindAllSlots();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLSlotElement) {
          bindSlot(node);

          return;
        }

        if (node instanceof Element) {
          node.querySelectorAll('slot').forEach((slotEl) => bindSlot(slotEl));
        }
      });

      mutation.removedNodes.forEach((node) => {
        if (node instanceof HTMLSlotElement) {
          unbindSlot(node);

          return;
        }

        if (node instanceof Element) {
          node.querySelectorAll('slot').forEach((slotEl) => unbindSlot(slotEl));
        }
      });
    }
  });

  if (host.shadowRoot) {
    observer.observe(host.shadowRoot, { childList: true, subtree: true });
  }

  onCleanup(() => {
    isDisposing = true;
    observer.disconnect();

    for (const cleanup of [...slotCleanupMap.values()]) cleanup();

    slotCleanupMap.clear();
    slotNodesByName.clear();
  });

  const slots: ComponentSlots = {
    elements: (name?: string) => ensureElementSignal(normalizeSlotName(name)),
    has: (name?: string) => ensurePresenceSignal(normalizeSlotName(name)),
  };

  slotsRegistry.set(host, slots);

  return slots;
};

// ─────────────────────────────────────────────────────────────────────────────
// REFLECT API (HOST ATTRIBUTE/EVENT/CLASS BINDING)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Describes a reactive or static host binding value.
 */
export type HostBindingValue =
  | (() => Record<string, boolean>)
  | (() => string | number | boolean | null | undefined)
  | string
  | number
  | boolean
  | null
  | undefined;

/**
 * Configuration for host attribute bindings.
 */
export type ReflectConfig = Record<string, HostBindingValue>;

export type HostBindConfig<CustomEvents extends Record<string, unknown> = Record<string, never>> =
  | { attr: ReflectConfig }
  | { class: () => Record<string, boolean> }
  | { on: HostEventListeners<CustomEvents> };

export type HostBindTarget = 'attr' | 'class' | 'on';

export type ComponentHost = {
  bind: {
    <CustomEvents extends Record<string, unknown> = Record<string, never>>(
      config: HostBindConfig<CustomEvents>,
      options?: AddEventListenerOptions,
    ): () => void;
    <CustomEvents extends Record<string, unknown> = Record<string, never>>(
      target: 'attr',
      config: ReflectConfig,
    ): () => void;
    (target: 'class', getter: () => Record<string, boolean>): () => void;
    <CustomEvents extends Record<string, unknown> = Record<string, never>>(
      target: 'on',
      hostEvents: HostEventListeners<CustomEvents>,
      options?: AddEventListenerOptions,
    ): () => void;
  };
  el: HTMLElement;
  shadowRoot: ShadowRoot;
};

export const createHost = (): ComponentHost => {
  const el = currentRuntime().el;

  return {
    bind: (
      targetOrConfig: HostBindTarget | HostBindConfig,
      configOrOptions?: ReflectConfig | (() => Record<string, boolean>) | HostEventListeners | AddEventListenerOptions,
      maybeOptions?: AddEventListenerOptions,
    ) => {
      const disposers: Array<() => void> = [];

      const config =
        typeof targetOrConfig === 'string'
          ? ({ [targetOrConfig]: configOrOptions } as HostBindConfig)
          : (targetOrConfig as HostBindConfig);
      const options =
        typeof targetOrConfig === 'string' && targetOrConfig === 'on'
          ? (maybeOptions as AddEventListenerOptions | undefined)
          : (configOrOptions as AddEventListenerOptions | undefined);

      if ('attr' in config) {
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

      if ('class' in config) {
        disposers.push(applyClassMap(el, config.class));
      }

      if ('on' in config) {
        for (const event of Object.keys(config.on) as Array<keyof typeof config.on>) {
          const listener = config.on[event];

          if (!listener) continue;

          disposers.push(listen(el, event as string, listener as EventListener, options));
        }
      }

      const cleanup = () => {
        while (disposers.length > 0) disposers.pop()?.();
      };

      onCleanup(cleanup);

      return cleanup;
    },
    el,
    shadowRoot: el.shadowRoot as ShadowRoot,
  };
};

function applyAttribute(host: HTMLElement, name: string, value: HostBindingValue): (() => void) | void {
  if (typeof value === 'function') {
    return effect(() => setAttr(host, name, (value as () => HostBindingValue)()));
  } else {
    setAttr(host, name, value);
  }
}

function applyClassMap(host: HTMLElement, getter: () => Record<string, boolean>): () => void {
  let prev = new Set<string>();

  return effect(() => {
    const next = new Set(
      Object.entries(getter())
        .filter(([, active]) => active)
        .map(([cls]) => cls),
    );

    for (const cls of prev) if (!next.has(cls)) host.classList.remove(cls);
    for (const cls of next) if (!prev.has(cls)) host.classList.add(cls);

    prev = next;
  });
}
