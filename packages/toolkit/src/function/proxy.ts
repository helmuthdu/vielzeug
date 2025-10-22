import { isObject } from '../typed/isObject';
import type { Obj } from '../types';

type ProxyOptions<T> = {
  set?: <K extends PropertyKey>(prop: K, curr: unknown, prev: unknown, target: T) => unknown;
  get?: <K extends PropertyKey>(prop: K, val: unknown, target: T) => unknown;
  deep?: boolean;
  watch?: (keyof T)[];
};

/**
 * Creates a new Proxy for the given object that invokes functions when properties are accessed or modified.

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
 * @param [options.set] - A function to call when a property is set. It receives the property name, current value, previous value, and the target object.
 * @param [options.get] - A function to call when a property is accessed. It receives the property name, value, and the target object.
 * @param [options.deep] - If true, the proxy will also apply to nested objects.
 * @param [options.watch] - An array of property names to watch. If provided, only these properties will trigger the set and get functions.
 *
 * @returns A new Proxy for the given object.
 */
export function proxy<T extends Obj>(item: T, options: ProxyOptions<T>): T {
  const { set, get, deep = false, watch } = options;

  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      if (watch && !watch.includes(prop as keyof T)) {
        return Reflect.get(target, prop, receiver);
      }

      let value = Reflect.get(target, prop, receiver);

      if (get) {
        // biome-ignore lint/suspicious/noExplicitAny: -
        value = get(prop, value, target) as any;
      }

      if (deep && isObject(value)) {
        return proxy(value as T[keyof T], options);
      }

      return value;
    },
    set(target, prop, val, receiver) {
      if (watch && !watch.includes(prop as keyof T)) {
        return Reflect.set(target, prop, val, receiver);
      }

      const prev = target[prop as keyof T];
      const value = set ? set(prop, val, prev, target) : val;

      if (deep && isObject(value)) {
        return Reflect.set(target, prop, proxy(value as T[keyof T], options), receiver);
      }

      return Reflect.set(target, prop, value, receiver);
    },
  };

  return new Proxy(item, handler);
}
