---
title: 'Arsenal Examples — parseJSON'
description: 'parseJSON example for @vielzeug/arsenal.'
---

## parseJSON

### Problem

You need to parse JSON from localStorage or an API without crashing on malformed input, and want a typed fallback for the error case.

### Solution

Use `parseJSON(json, options?)` to return the parsed value or a `defaultValue` when parsing fails. It accepts `string | null | undefined`.

```ts
import { parseJSON } from '@vielzeug/arsenal';

const raw = localStorage.getItem('settings');
const settings = parseJSON(raw, { defaultValue: { theme: 'light' } });
// returns parsed object or { theme: 'light' } on failure
```

#### With a validator

```ts
import { parseJSON } from '@vielzeug/arsenal';
import { s } from '@vielzeug/spell';

const Schema = s.object({ theme: s.string() });
const settings = parseJSON(raw, {
  defaultValue: { theme: 'light' },
  validator: (v) => Schema.safeParse(v).ok,
});
```

### Pitfalls

- Without `defaultValue`, returns `undefined` on failure — the return type includes `undefined`.
- `null` / `undefined` input immediately returns `defaultValue` without calling `JSON.parse`.
- The JSON string `"null"` parses to `null` (not `defaultValue`) — only the input being `null` triggers the fallback.

### Related

- [stableStringify](./stableStringify.md)
- [getPath](./path.md)
