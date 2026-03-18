import { type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { currentRuntime, effect, onMount } from './runtime';

// ─── Context registry ─────────────────────────────────────────────────────────
const contextRegistry = new WeakMap<HTMLElement, Map<InjectionKey<unknown> | string | symbol, unknown>>();

export type InjectionKey<T> = symbol & {
  readonly __craftit_injection_key?: T;
};

/** Sentinel used to distinguish "argument not passed" from `undefined` in overloaded functions. */
const _UNSET = Symbol('craftit.unset');

export const useProvide = <T>(key: InjectionKey<T> | string | symbol, value: T): void => {
  const el = currentRuntime().el;

  if (!contextRegistry.has(el)) contextRegistry.set(el, new Map());

  contextRegistry.get(el)!.set(key, value);
};

export function useInject<T>(key: InjectionKey<T> | string | symbol): T | undefined;
export function useInject<T>(key: InjectionKey<T> | string | symbol, fallback: T): T;
export function useInject<T>(
  key: InjectionKey<T> | string | symbol,
  fallback: T | typeof _UNSET = _UNSET,
): T | undefined {
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
    console.warn(`[craftit:E7] useInject key missing: ${String(key)}`);

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
 * syncContextProps(useInject(BUTTON_GROUP_CTX), props, ['color', 'size', 'variant']);
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
