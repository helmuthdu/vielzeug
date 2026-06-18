/**
 * Component context injection API — `inject` / `injectStrict` / `createContext`.
 *
 * Context values are stored on the providing element via a WeakMap registry and
 * resolved by walking up the DOM tree (including through shadow boundaries).
 * Providing is done via `ctx.provide(key, value)` inside `setup()`.
 */

import { CRAFT_ERRORS } from './errors';
import { getSetupContext, getCurrentElement } from './runtime';

const contextRegistry = new WeakMap<HTMLElement, Map<InjectionKey<unknown>, unknown>>();

export type InjectionKey<T> = symbol & {
  readonly __craftit_injection_key?: T;
};

/** @internal Build a linear ancestor chain (including shadow host boundaries). */
const buildAncestorChain = (start: HTMLElement): HTMLElement[] => {
  const chain: HTMLElement[] = [];
  let node: Node | null = start;

  while (node) {
    if (node instanceof HTMLElement) chain.push(node);

    const root = node.getRootNode() as Node;

    node = (node as HTMLElement).parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }

  return chain;
};

/**
 * Register a context value on a specific element.
 * @internal Used by ctx.provide() — do not call directly.
 */
export const provideOnElement = <T>(el: HTMLElement, key: InjectionKey<T>, value: T): void => {
  if (!contextRegistry.has(el)) contextRegistry.set(el, new Map());

  contextRegistry.get(el)!.set(key, value);
};

export function inject<T>(key: InjectionKey<T>): T | undefined;
export function inject<T>(key: InjectionKey<T>, fallback: T): T;
export function inject<T>(key: InjectionKey<T>, ...rest: [T?]): T | undefined {
  const ctx = getSetupContext();

  if (!ctx) throw new Error(CRAFT_ERRORS.lifecycleOutsideSetup);

  const chain = buildAncestorChain(ctx.element);

  for (const node of chain) {
    const map = contextRegistry.get(node);

    if (map?.has(key)) return map.get(key) as T;
  }

  return rest.length > 0 ? rest[0] : undefined;
}

const NOT_FOUND = Symbol('inject.not_found');

export const injectStrict = <T>(key: InjectionKey<T>): T => {
  const resolved = inject<T>(key, NOT_FOUND as unknown as T);

  if (resolved !== (NOT_FOUND as unknown)) return resolved;

  const host = getCurrentElement();

  throw new Error(CRAFT_ERRORS.injectStrictFailed(String(key), host.localName));
};

export function createContext<T>(description?: string): InjectionKey<T> {
  return Symbol(description) as InjectionKey<T>;
}
