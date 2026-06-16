---
title: 'Arsenal Examples — parseJSON'
description: 'parseJSON example for @vielzeug/arsenal.'
---

## parseJSON

### Problem

You receive JSON strings from localStorage, an API, or user input and need to parse them safely without try-catch boilerplate — falling back to a default value on failure.

### Solution

Use `parseJSON(json, options?)` which returns `undefined` (or `fallback`) instead of throwing on invalid input.

```ts
import { parseJSON } from '@vielzeug/arsenal';

const config = parseJSON('{"api":{"host":"localhost","port":3000}}');
// { api: { host: 'localhost', port: 3000 } }

const broken = parseJSON('not valid json');
// undefined

const withFallback = parseJSON('not valid json', {
  fallback: { host: 'localhost', port: 3000 },
});
// { host: 'localhost', port: 3000 }
```

#### Null and undefined input

```ts
import { parseJSON } from '@vielzeug/arsenal';

parseJSON(null, { fallback: [] });      // []
parseJSON(undefined, { fallback: [] }); // []
parseJSON('null');                       // null  (not fallback — valid JSON)
```

#### Validate the parsed shape

```ts
import { parseJSON } from '@vielzeug/arsenal';

type Config = { host: string; port: number };

const cfg = parseJSON<Config>(raw, {
  fallback: { host: 'localhost', port: 3000 },
  validator: (v): v is Config =>
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Config).host === 'string' &&
    typeof (v as Config).port === 'number',
});
```

### Pitfalls

- The JSON string `"null"` parses to `null`, not `fallback`.
- `validator` receives the fully parsed value; returning `false` falls back to `fallback`.

### Related

- [stringify](./stringify.md)
