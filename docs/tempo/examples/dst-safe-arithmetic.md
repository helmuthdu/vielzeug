---
title: 'Tempo Examples — DST-Safe Arithmetic'
description: 'Resolve a wall-clock DST overlap and shift it safely with Tempo.'
---

## DST-Safe Arithmetic

### Problem

A wall-clock value during a DST transition is not an instant until you choose a timezone and disambiguation strategy.

### Solution

Parse the wall-clock value explicitly, resolve it with `timeZone` and `disambiguation`, then shift the zoned value.

```ts
import { parse, shift, toInstant } from '@vielzeug/tempo';

const wallClock = parse('2026-11-01T01:30:00', { as: 'plainDateTime' });
const instant = toInstant(wallClock, {
  disambiguation: 'later',
  timeZone: 'America/New_York',
});
const nextHour = shift(instant, { hours: 1 }, { timeZone: 'America/New_York' });
```

### Pitfalls

- Pass `timeZone` for every plain date or plain date-time conversion.
- Choose `disambiguation: 'reject'` when ambiguous local input must fail.

### Related

- [Timezone Conversion](./timezone-conversion.md)
- [Usage Guide](../usage.md)
