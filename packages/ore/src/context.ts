/**
 * Component context injection API — `inject` / `injectStrict` / `provide` / `createContext`.
 *
 * Context values are stored on the providing element via a WeakMap registry and
 * resolved by walking up the DOM tree (including through shadow boundaries).
 * Providing is done via `provide(key, value)` inside `setup()`.
 */

import { warn } from './_dev';
import { OreApiError, ORE_ERRORS } from './errors';
import { getHost, requireSetupContext } from './runtime';

const contextRegistry = new WeakMap<HTMLElement, Map<InjectionKey<unknown>, unknown>>();

export type InjectionKey<T> = symbol & {
  readonly __ore_injection_key?: T;
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
 * @internal Backs the public `provide()` — do not call directly.
 */
const provideOnElement = <T>(el: HTMLElement, key: InjectionKey<T>, value: T): void => {
  const map = contextRegistry.get(el) ?? new Map<InjectionKey<unknown>, unknown>();

  // `inject()` memoizes its result per consumer (see resolvedCache below), so a
  // provider swapping the raw value after a descendant already read it would be
  // silently ignored downstream. Provide a `Readable` (signal/computed) instead
  // of a raw value so descendants observe updates through the value itself.
  if (map.has(key)) {
    warn(
      `provide(): key already provided on <${el.localName}> — overwriting. Provide a Readable to update it instead.`,
    );
  }

  map.set(key, value);
  contextRegistry.set(el, map);
};

/**
 * Register a context value on the current component's host element, making it
 * available to descendant components via `inject(key)`.
 *
 * Provide a `Readable` (signal/computed) rather than a raw value if descendants
 * need to observe later changes — `inject()` resolves and caches the value once
 * per consumer, so re-calling `provide()` with a new raw value later is not seen.
 */
export const provide = <T>(key: InjectionKey<T>, value: T): void => provideOnElement(getHost(), key, value);

const NOT_FOUND_SENTINEL = Symbol('inject.not_found');

/** Per-setup-context cache: avoids repeated ancestor walks for the same key. */
const resolvedCache = new WeakMap<object, Map<InjectionKey<unknown>, unknown>>();

const walkAndFind = <T>(element: HTMLElement, key: InjectionKey<T>): T | typeof NOT_FOUND_SENTINEL => {
  const chain = buildAncestorChain(element);

  for (const node of chain) {
    const map = contextRegistry.get(node);

    if (map?.has(key)) return map.get(key) as T;
  }

  return NOT_FOUND_SENTINEL;
};

export function inject<T>(key: InjectionKey<T>): T | undefined;
export function inject<T>(key: InjectionKey<T>, fallback: T): T;
export function inject<T>(key: InjectionKey<T>, ...rest: [T?]): T | undefined {
  const ctx = requireSetupContext('inject');

  let cache = resolvedCache.get(ctx);

  if (!cache) {
    cache = new Map();
    resolvedCache.set(ctx, cache);
  }

  const cacheKey = key as InjectionKey<unknown>;

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);

    if (cached === NOT_FOUND_SENTINEL) return rest.length > 0 ? rest[0] : undefined;

    return cached as T;
  }

  const found = walkAndFind(ctx.element, key);

  cache.set(cacheKey, found);

  if (found === NOT_FOUND_SENTINEL) return rest.length > 0 ? rest[0] : undefined;

  return found;
}

export const injectStrict = <T>(key: InjectionKey<T>): T => {
  const resolved = inject<T>(key, NOT_FOUND_SENTINEL as unknown as T);

  if (resolved !== (NOT_FOUND_SENTINEL as unknown)) return resolved;

  const host = getHost();

  throw new OreApiError(ORE_ERRORS.injectStrictFailed(String(key), host.localName));
};

export function createContext<T>(description?: string): InjectionKey<T> {
  return Symbol(description) as InjectionKey<T>;
}
