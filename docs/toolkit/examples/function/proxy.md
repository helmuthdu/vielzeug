# proxy

Creates a new Proxy for the given object that invokes functions when properties are accessed or modified. Supports deep proxying and selective property watching.

## API

```ts
proxy<T extends Obj>(item: T, options: {
  set?: <K extends PropertyKey>(prop: K, curr: unknown, prev: unknown, target: T) => unknown;
  get?: <K extends PropertyKey>(prop: K, val: unknown, target: T) => unknown;
  deep?: boolean;
  watch?: (keyof T)[];
}): T
```

- `item`: Object to proxy.
- `options.set`: Function called on property set.
- `options.get`: Function called on property get.
- `options.deep`: If true, proxies nested objects.
- `options.watch`: Array of property names to watch (optional).
- Returns: Proxied object.

## Example

```ts
import { proxy } from '@vielzeug/toolkit';

const obj = { a: 1, b: 2 };
const log = (prop, curr, prev, target) => console.log(`Property '${prop}' changed from ${prev} to ${curr}`);
const proxyObj = proxy(obj, { set: log });
proxyObj.a = 3; // logs 'Property 'a' changed from 1 to 3'
```

## Notes

- Use `deep` for nested objects.
- Use `watch` to limit which properties trigger handlers.
- Both `set` and `get` handlers are optional.

## Related

- [memo](./memo.md)
