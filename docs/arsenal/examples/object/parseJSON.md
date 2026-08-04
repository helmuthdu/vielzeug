---
title: 'Arsenal Examples — tryParseJson'
description: 'tryParseJson example for @vielzeug/arsenal.'
---

## tryParseJson

### Problem

You need to preserve JSON syntax failure before validating parsed application data.

### Solution

```ts
import { tryParseJson } from '@vielzeug/arsenal/object';
import { s } from '@vielzeug/spell';

const User = s.object({ id: s.number(), name: s.string() });
const parsed = tryParseJson(raw);

if (!parsed.ok) throw parsed.error;

const user = User.parse(parsed.value);
```

### Pitfalls

- Successful values are `unknown`, not claimed generic types.
- Use a schema validator for application data.
- Use `JSON.parse` directly when syntax failures should throw immediately.
