---
title: 'Tempo Examples — Locale Formatting'
description: 'Locale-aware date and time formatting example for @vielzeug/tempo.'
---

## Locale Formatting

### Problem

Displaying dates and times for international users requires locale-specific formats, calendar systems, and timezone offsets. `Intl.DateTimeFormat` handles this but requires verbose configuration and careful key management for caching.

### Solution

Use `format()` with the `pattern` shorthand for common layouts, or pass `intl` directly for a custom `Intl.DateTimeFormatOptions`. Tempo manages formatter caching internally.

```ts
import { format, formatInstant, formatRange, formatRelative, parseInstant } from '@vielzeug/tempo';

const time = parseInstant('2026-03-21T10:15:30Z');

// Preset patterns
format(time, { pattern: 'short', locale: 'en-US', tz: 'UTC' }); // '3/21/2026, 10:15 AM'
format(time, { pattern: 'short', locale: 'de-DE', tz: 'Europe/Berlin' }); // '21.3.2026, 11:15'
format(time, { pattern: 'short', locale: 'ja-JP', tz: 'Asia/Tokyo' }); // '2026/3/21 19:15'

// All preset patterns
format(time, { pattern: 'medium', locale: 'en-GB', tz: 'UTC' }); // '21 Mar 2026, 10:15'
format(time, { pattern: 'long', locale: 'en-GB', tz: 'UTC' }); // 'Saturday, 21 March 2026 at 10:15:30'
format(time, { pattern: 'date-only', locale: 'en-GB', tz: 'UTC' }); // '21/03/2026'
format(time, { pattern: 'time-only', locale: 'en-GB', tz: 'UTC' }); // '10:15'

// Stable UTC instant string (for APIs and logs)
formatInstant(time); // '2026-03-21T10:15:30Z'
```

#### Escape Hatch: Full Intl Spec

When presets do not fit, pass `intl` directly. The `intl` option takes full precedence over `pattern`.

```ts
format(time, {
  locale: 'de-DE',
  tz: 'Europe/Berlin',
  intl: { dateStyle: 'short', timeStyle: 'short', weekday: 'long', hour12: false },
});
// → 'Samstag, 21.3.2026, 11:15'
```

#### Range Formatting

```ts
import { formatRange, parseInstant } from '@vielzeug/tempo';

formatRange(parseInstant('2026-03-21T10:00:00Z'), parseInstant('2026-03-21T12:00:00Z'), {
  pattern: 'short',
  locale: 'en-US',
  tz: 'America/New_York',
});
// → '3/21/2026, 6:00 AM – 8:00 AM'
```

#### Relative Formatting

```ts
import { formatRelative, parseInstant } from '@vielzeug/tempo';

const base = parseInstant('2026-03-21T10:00:00Z');

formatRelative(parseInstant('2026-03-21T12:00:00Z'), { base, locale: 'en-US', numeric: 'always' });
// → 'in 2 hours'

formatRelative(parseInstant('2026-03-19T10:00:00Z'), { base, locale: 'en-US' });
// → '2 days ago'

formatRelative(parseInstant('2026-03-21T10:00:45Z'), { base, locale: 'de-DE', numeric: 'auto' });
// → 'in 45 Sekunden'
```

### Pitfalls

- `pattern` and `intl` are mutually exclusive at the TypeScript type level (`FormatOptions` is a discriminated union). TypeScript will report an error if you attempt to pass both — do not rely on one overriding the other.
- `formatRelative()` only accepts `Temporal.Instant` or `Temporal.ZonedDateTime` inputs. Passing a `PlainDateTime` or `PlainDate` throws a `TypeError`.
- Locale strings must be valid BCP 47 tags. An invalid locale (e.g., `'english'`) may silently fall back to the system locale or throw depending on the runtime.

### Related

- [Timezone Conversion](./timezone-conversion.md)
- [API Reference — `format()`](/tempo/api#format-input-options-string)
- [API Reference — `formatRelative()`](/tempo/api#formatrelative-input-options-string)
