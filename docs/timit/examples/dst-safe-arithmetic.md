---
title: DST-safe Arithmetic
description: Handling daylight-saving time transitions with Timit arithmetic.
---

# DST-safe Arithmetic

When adding or subtracting time, DST transitions are handled automatically.

## Spring Forward (Gap)

In North America, on March 8, 2026, at 2:00 AM EST, clocks spring forward to 3:00 AM EDT.

```ts
import { d } from '@vielzeug/timit';

// One hour before the transition
const before = '2026-03-08T01:30:00-05:00[America/New_York]';

// Add 1 hour — should jump to 3:30 EDT (not 2:30)
const after = d.add(before, { hours: 1 });

console.log(after.toString());
// → 2026-03-08T03:30:00-04:00[America/New_York]
```

## Fall Back (Overlap)

In North America, on November 1, 2026, at 2:00 AM EDT, clocks fall back to 1:00 AM EST. The hour from 1:00–2:00 AM happens twice.

```ts
// First occurrence: 1:30 AM EDT
const first = d.asInstant('2026-11-01T01:30:00-04:00[America/New_York]');

// Convert to different representation
const zoned = d.asZoned(first, { tz: 'America/New_York', when: 'earlier' });
console.log(zoned.toString());
// → 2026-11-01T01:30:00-04:00[America/New_York] (EDT, first occurrence)
```

## Why This Matters

Without DST awareness, you'd calculate incorrect times:

```ts
// ❌ Wrong: Naive millisecond math
const wrongReminder = new Date(meeting.getTime() - 30 * 60_000);

// ✅ Correct: Timit handles DST
const rightReminder = d.subtract(meeting, { minutes: 30 });
```

## Compare Instants Across DST

```ts
const beforeDst = '2026-03-08T01:30:00-05:00[America/New_York]';
const afterDst = '2026-03-08T04:00:00-04:00[America/New_York]';

const duration = d.diff(beforeDst, afterDst);
console.log(duration.toString()); // PT2H30M — correct!
```

