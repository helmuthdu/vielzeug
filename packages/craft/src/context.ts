/**
 * Component context injection API — `provide` / `inject` / `createContext`.
 *
 * Context values are stored on the providing element via a WeakMap registry and
 * resolved by walking up the DOM tree (including through shadow boundaries).
 */

import { CRAFTIT_ERRORS } from './errors';
import { getCurrentElement } from './runtime';

const contextRegistry = new WeakMap<HTMLElement, Map<InjectionKey<unknown>, unknown>>();

export type InjectionKey<T> = symbol & {
  readonly __craftit_injection_key?: T;
};

export const provide = <T>(key: InjectionKey<T>, value: T): void => {
  const el = getCurrentElement();

  if (!contextRegistry.has(el)) contextRegistry.set(el, new Map());

  contextRegistry.get(el)!.set(key, value);
};

export function inject<T>(key: InjectionKey<T>): T | undefined;
export function inject<T>(key: InjectionKey<T>, fallback: T): T;
export function inject<T>(key: InjectionKey<T>, ...rest: [T?]): T | undefined {
  let node: Node | null = getCurrentElement();

  while (node) {
    if (node instanceof HTMLElement) {
      const map = contextRegistry.get(node);

      if (map?.has(key)) return map.get(key) as T;
    }

    const root = node.getRootNode() as Node;

    node = (node as HTMLElement).parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }

  return rest.length > 0 ? rest[0] : undefined;
}

const NOT_FOUND = Symbol('inject.not_found');

export const injectStrict = <T>(key: InjectionKey<T>): T => {
  const resolved = inject<T>(key, NOT_FOUND as unknown as T);

  if (resolved !== (NOT_FOUND as unknown)) return resolved;

  const host = getCurrentElement();

  throw new Error(CRAFTIT_ERRORS.injectStrictFailed(String(key), host.localName));
};

export function createContext<T>(description?: string): InjectionKey<T> {
  return Symbol(description) as InjectionKey<T>;
}
