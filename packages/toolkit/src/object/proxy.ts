import type { Obj } from '../types';

import { isObject } from '../typed/isObject';

// #region ProxyOptions
type ProxyOptions<T> = {
  deep?: boolean;
  get?: <K extends PropertyKey>(prop: K, val: unknown, target: T) => unknown;
  set?: <K extends PropertyKey>(prop: K, curr: unknown, prev: unknown, target: T) => unknown;
  watch?: (keyof T)[];
};
// #endregion ProxyOptions

/**
 * Creates a new Proxy for the given object that invokes functions when properties are accessed or modified.
 *
 * @example
 * ```ts
 * const obj = { a: 1, b: 2 };
 * const log = (prop, curr, prev, target) => console.log(`Property '${prop}' changed from ${prev} to ${curr}`);
 * const proxyObj = proxy(obj, { set: log });
 * proxyObj.a = 3; // logs 'Property 'a' changed from 1 to 3'
 * ```
 *
 * @param item - The object to observe.
 * @param options - Configuration options for the proxy.
 * @param [options.set] - A function to call when a property is set.
 * @param [options.get] - A function to call when a property is accessed.
 * @param [options.deep] - If true, the proxy will also apply to nested objects.
 * @param [options.watch] - An array of property names to watch.
 *
 * @returns A new Proxy for the given object.
 */
export function proxy<T extends Obj>(item: T, options: ProxyOptions<T>): T {
  const { deep = false, get, set, watch } = options;
  const watchSet = watch ? new Set<PropertyKey>(watch as PropertyKey[]) : null;

  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      if (watchSet && !watchSet.has(prop)) {
        return Reflect.get(target, prop, receiver);
      }

      let value = Reflect.get(target, prop, receiver);

      if (get) {
        value = get(prop, value, target) as any;
      }

      if (deep && isObject(value)) {
        return proxy(value as unknown as T, options);
      }

      return value;
    },
    set(target, prop, val, receiver) {
      if (watchSet && !watchSet.has(prop)) {
        return Reflect.set(target, prop, val, receiver);
      }

      const prev = target[prop as keyof T];
      const value = set ? set(prop, val, prev, target) : val;

      if (deep && isObject(value)) {
        return Reflect.set(target, prop, proxy(value as unknown as T, options), receiver);
      }

      return Reflect.set(target, prop, value, receiver);
    },
  };

  return new Proxy(item, handler);
}
