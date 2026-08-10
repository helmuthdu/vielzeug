---
title: 'Tempo Examples — Timezone Conversion'
description: 'Project an instant into user timezones with inTimeZone().'
---

## Timezone Conversion

### Problem

An event has one absolute instant but needs distinct local displays for each user.

### Solution

Parse the API timestamp as an instant and project it with `inTimeZone()`.

```ts
import { format, inTimeZone, parse } from '@vielzeug/tempo';

const event = parse('2026-04-15T14:00:00Z', { as: 'instant' });

for (const timeZone of ['America/New_York', 'Europe/Berlin', 'Asia/Tokyo']) {
  const local = inTimeZone(event, timeZone);
  console.log(format(local, { locale: 'en-US', pattern: 'long' }));
}
```

### Pitfalls

- `inTimeZone()` projects the same instant; it does not add elapsed time.
- Use `shift()` with a `timeZone` option for calendar-aware arithmetic.

### Related

- [DST-Safe Arithmetic](./dst-safe-arithmetic.md)
- [Usage Guide](../usage.md)
