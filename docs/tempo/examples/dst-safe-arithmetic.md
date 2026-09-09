---
title: 'Tempo Examples — DST-Safe Arithmetic'
description: 'Resolve a wall-clock DST overlap and shift it safely with direct Temporal methods.'
---

## DST-Safe Arithmetic

### Problem

A wall-clock value during a DST transition is not an instant until you choose a timezone and disambiguation strategy.

### Solution

Parse the wall-clock value explicitly, then use `shift()` with `timeZone` and `disambiguation` for DST-safe arithmetic.

```ts
import { parse, shift } from '@vielzeug/tempo';

const wallClock = parse('2026-11-01T01:30:00', { as: 'plainDateTime' });
const nextHour = shift(wallClock, { hours: 1 }, {
  disambiguation: 'later',
  timeZone: 'America/New_York',
});
```

### Pitfalls

- Pass `timeZone` for every plain date or plain date-time conversion.
- Choose `disambiguation: 'reject'` when ambiguous local input must fail.

### Related

- [Timezone Conversion](./timezone-conversion.md)
- [Usage Guide](../usage.md)
