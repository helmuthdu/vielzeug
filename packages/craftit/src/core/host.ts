/**
 * Host utilities — component context injection, slot observation, and attribute/class reflection.
 *
 * - Context API (provide, inject, createContext, syncContextProps)
 * - Slot observation and detection (Slots type, createSlots, onSlotChange)
 * - Host element binding (reflect) for attributes, events, and classes
 */

import { type ReadonlySignal, type Signal, signal } from '@vielzeug/stateit';

// Use the wrapped effect from runtime-lifecycle so reactive bindings are
// automatically cleaned up on unmount — raw stateit effect has no lifecycle awareness.
import { currentRuntime, effect, handle, onCleanup, onMount } from './runtime-lifecycle';
import { setAttr } from './utilities';

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
      for (const k of keys) {
        const v = ctx[k]?.value;

        if (v !== undefined) props[k].value = v;
      }
    });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SLOTS API
// ─────────────────────────────────────────────────────────────────────────────

const missingSlotWarnings = new Set<string>();

const warnMissingSlot = (el: HTMLElement, slotName: string, source: 'onSlotChange()' | 'slots.has()'): void => {
  const key = `${source}:${el.localName}:${slotName || 'default'}`;

  if (missingSlotWarnings.has(key)) return;

  missingSlotWarnings.add(key);
  console.warn(
    `[craftit:E10] ${source} could not find a matching <slot${slotName ? ` name="${slotName}"` : ''}> in <${el.localName}>. Render the slot before using ${source}.`,
  );
};

export type Slots<T extends Record<string, unknown> = Record<string, unknown>> = {
  /**
   * Returns a `ReadonlySignal<boolean>` that is `true` when the slot has assigned content.
   * Reactive — use the signal directly in templates, computed(), or effects.
   * @example const hasIcon = slots.has('icon'); // ReadonlySignal<boolean>
   */
  has(name: keyof T): ReadonlySignal<boolean>;
};

/**
 * Observes a slot and calls `callback` with assigned elements whenever they change.
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
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

  handler();
  slot.addEventListener('slotchange', handler);
  onCleanup(() => slot.removeEventListener('slotchange', handler));
};

export const createSlots = <T extends Record<string, unknown> = Record<string, unknown>>(): Slots<T> => {
  const el = currentRuntime().el;
  const sigs = new Map<string, Signal<boolean>>();

  const get = (slotName: string): Signal<boolean> => {
    if (sigs.has(slotName)) return sigs.get(slotName)!;

    const s = signal(false);

    sigs.set(slotName, s);

    onMount(() => {
      const selector = slotName ? `slot[name="${slotName}"]` : 'slot:not([name])';
      const slot = el.shadowRoot?.querySelector<HTMLSlotElement>(selector);

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
    });

    return s;
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

/**
 * Configuration for `reflect()`.
 */
export type ReflectConfig = {
  [key: string]: HostBindingValue | ((e: Event) => void);
  classMap?: () => Record<string, boolean>;
};

/**
 * Reflect reactive attributes, events, and classes to a host element.
 * Must be called within a component setup context.
 *
 * - `on*` keys map to event listeners: `onClick` → `'click'`, `onValueChanged` → `'valueChanged'`
 * - `classMap` maps to a reactive class object
 * - all other keys map to attributes (static or reactive getter)
 *
 * @example
 * setup({ reflect }) {
 *   reflect({
 *     role: 'checkbox',
 *     tabindex: () => props.disabled.value ? undefined : 0,
 *     checked: () => props.checked.value,
 *     classMap: () => ({ checked: props.checked.value }),
 *     onClick: handleToggle,
 *   });
 * }
 */
export function reflect(host: HTMLElement, config: ReflectConfig): void {
  for (const [key, value] of Object.entries(config)) {
    if (key === 'classMap') {
      applyClassMap(host, value as () => Record<string, boolean>);
    } else if (key.startsWith('on') && key.length > 2 && typeof value === 'function') {
      // onClick → 'click', onValueChanged → 'valueChanged', onKeydown → 'keydown'
      const raw = key.slice(2);

      handle(host, raw[0].toLowerCase() + raw.slice(1), value as (e: Event) => void);
    } else {
      applyAttribute(host, key, value as HostBindingValue);
    }
  }
}

function applyAttribute(host: HTMLElement, name: string, value: HostBindingValue): void {
  if (typeof value === 'function') {
    effect(() => setAttr(host, name, (value as () => HostBindingValue)()));
  } else {
    setAttr(host, name, value);
  }
}

function applyClassMap(host: HTMLElement, getter: () => Record<string, boolean>): void {
  let prev = new Set<string>();

  effect(() => {
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
