---
title: 'Tempo Examples — Locale Formatting'
description: 'Format explicit Temporal instants with Intl locale and timeZone options.'
---

## Locale Formatting

### Problem

A timestamp needs locale-aware output without leaking the host timezone into server-rendered content.

### Solution

Parse it as an instant and pass `timeZone` explicitly to `format()`.

```ts
import { format, formatRelative, parse } from '@vielzeug/tempo';

const event = parse('2026-03-21T10:15:30Z', { as: 'instant' });

const display = format(event, {
  locale: 'de-DE',
  pattern: 'long',
  timeZone: 'Europe/Berlin',
});

const relative = formatRelative(event, {
  base: parse('2026-03-21T08:15:30Z', { as: 'instant' }),
  locale: 'de-DE',
});
```

### Pitfalls

- `pattern` and `intl` are mutually exclusive.
- Use `formatInstant()` for transport and log output.

### Related

- [Timezone Conversion](./timezone-conversion.md)
- [Usage Guide](../usage.md)
