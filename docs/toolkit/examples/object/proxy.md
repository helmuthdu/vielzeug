<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
</div>

# proxy

The `proxy` utility wraps an object in a JavaScript `Proxy` that intercepts property get and set operations, allowing you to observe or transform property access without modifying the original object.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/object/proxy.ts
:::

## Features

- **Non-destructive**: The original object is not modified.
- **Get & Set hooks**: Intercept both reads and writes independently.
- **Deep mode**: Automatically wraps nested objects too.
- **Watch list**: Limit interception to specific property names.

## API

```ts
function proxy<T extends object>(item: T, options: ProxyOptions<T>): T;

type ProxyOptions<T> = {
  set?: <K extends PropertyKey>(prop: K, curr: unknown, prev: unknown, target: T) => unknown;
  get?: <K extends PropertyKey>(prop: K, val: unknown, target: T) => unknown;
  deep?: boolean;
  watch?: (keyof T)[];
};
```

### Parameters

- `item`: The object to wrap.
- `options.set`: Called when a property is set. The return value becomes the stored value.
- `options.get`: Called when a property is accessed. The return value is what the caller receives.
- `options.deep`: If `true`, nested objects are also proxied automatically.
- `options.watch`: Restrict hooks to only these property names.

### Returns

- A `Proxy` for the given object with the same type as `item`.

## Examples

### Observe Property Changes

```ts
import { proxy } from '@vielzeug/toolkit';

const state = { count: 0, name: 'Alice' };

const observed = proxy(state, {
  set: (prop, curr, prev) => {
    console.log(`${String(prop)}: ${prev} → ${curr}`);
    return curr;
  },
});

observed.count = 5;   // logs: count: 0 → 5
observed.name = 'Bob'; // logs: name: Alice → Bob
```

### Transform on Get

```ts
import { proxy } from '@vielzeug/toolkit';

const config = { apiUrl: 'https://api.example.com', timeout: 5000 };

const secured = proxy(config, {
  get: (prop, val) => {
    if (prop === 'apiUrl') return val; // allow
    return '***'; // mask everything else
  },
});

secured.apiUrl;  // 'https://api.example.com'
secured.timeout; // '***'
```

### Watch Specific Keys Only

```ts
import { proxy } from '@vielzeug/toolkit';

const user = { id: 1, name: 'Alice', role: 'admin' };
const changes: string[] = [];

const watched = proxy(user, {
  set: (prop, curr) => { changes.push(String(prop)); return curr; },
  watch: ['name'], // only 'name' is intercepted
});

watched.name = 'Bob'; // changes → ['name']
watched.role = 'user'; // not intercepted
```

### Deep Proxy

```ts
import { proxy } from '@vielzeug/toolkit';

const data = { user: { profile: { theme: 'dark' } } };

const deep = proxy(data, {
  set: (prop, curr, prev) => {
    console.log(`${String(prop)}: ${JSON.stringify(prev)} → ${JSON.stringify(curr)}`);
    return curr;
  },
  deep: true,
});

deep.user.profile.theme = 'light'; // logs: theme: "dark" → "light"
```

## See Also

- [diff](./diff.md): Compare two plain objects, returning their structural differences.
- [prune](./prune.md): Remove null/empty values from an object.

<style>
.badges { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
</style>
