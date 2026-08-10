---
title: 'Tempo Examples — Expiry Classification'
description: 'Classify fixed elapsed-time expiry thresholds with classifyExpiry().'
---

## Expiry Classification

### Problem

Expiry labels need deterministic, named thresholds without hiding calendar approximations.

### Solution

Use fixed elapsed-time units and treat `null` as the safe or unclassified state.

```ts
import { classifyExpiry, parse } from '@vielzeug/tempo';

const status = classifyExpiry({
  relativeTo: parse('2026-06-01T00:00:00Z', { as: 'instant' }),
  thresholds: {
    expired: { days: 0 },
    critical: { days: 3 },
    warning: { days: 14 },
  },
  value: parse('2026-06-04T00:00:00Z', { as: 'instant' }),
});

const label = status ?? 'safe';
```

### Pitfalls

- Thresholds support fixed elapsed-time units only; months and years throw.
- Pin `relativeTo` in tests for deterministic classifications.
- `humanize()` has English unit names; use `formatRelative()` for localized UI.

### Related

- [Date Ranges and Recurrence](./date-ranges-and-recurrence.md)
- [Usage Guide](../usage.md)
