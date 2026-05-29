---
title: Locale Formatting
description: Formatting times for different locales and languages with Tempo.
---

Format times respecting user locale, language, and timezone.

## Basic Locale Formatting

```ts
import { formatHuman, formatInstant, formatRange, formatRelative } from '@vielzeug/tempo';

const time = Temporal.Instant.from('2026-03-21T10:15:30Z');

// English (US)
formatHuman(time, { pattern: 'short', locale: 'en-US', tz: 'UTC' });
// → "3/21/2026, 10:15 AM"

// German
formatHuman(time, { pattern: 'short', locale: 'de-DE', tz: 'Europe/Berlin' });
// → "21.3.2026, 11:15"

// Japanese
formatHuman(time, { pattern: 'short', locale: 'ja-JP', tz: 'Asia/Tokyo' });
// → "2026/3/21 19:15"
```

## All Format Patterns

```ts
const time = Temporal.Instant.from('2026-03-21T10:15:30Z');

const patterns = ['short', 'medium', 'long', 'date-only', 'time-only'] as const;

for (const pattern of patterns) {
  const formatted = formatHuman(time, { pattern, locale: 'en-GB', tz: 'UTC' });
  console.log(`${pattern.padEnd(10)} ${formatted}`);
}

console.log(`iso       ${formatInstant(time)}`);

// Output:
// short      21/03/2026, 10:15
// medium     21 Mar 2026, 10:15
// long       Saturday, 21 March 2026 at 10:15:30
// iso        2026-03-21T10:15:30Z
// date-only  21/03/2026
// time-only  10:15
```

## Advanced: Escape Hatch to Intl

Use the `intl` option for custom `Intl.DateTimeFormatOptions`:

```ts
formatHuman(time, {
  locale: 'de-DE',
  tz: 'Europe/Berlin',
  intl: {
    dateStyle: 'short',
    timeStyle: 'short',
    weekday: 'long',
    hour12: false,
  },
});
// → "Samstag, 21.3.2026, 11:15"
```

## Range Formatting

Format a span of time:

```ts
const start = Temporal.Instant.from('2026-03-21T10:00:00Z');
const end = Temporal.Instant.from('2026-03-21T12:00:00Z');

formatRange(start, end, {
  pattern: 'short',
  locale: 'en-US',
  tz: 'America/New_York',
});
// → "3/21/2026, 6:00 AM – 8:00 AM"
```

## Relative Formatting

Generate UX-friendly relative labels (for example, "in 2 hours" or "3 days ago"):

```ts
const base = Temporal.Instant.from('2026-03-21T10:00:00Z');

formatRelative(Temporal.Instant.from('2026-03-21T12:00:00Z'), {
  base,
  locale: 'en-US',
  numeric: 'always',
});
// → "in 2 hours"

formatRelative(Temporal.Instant.from('2026-03-19T10:00:00Z'), {
  base,
  locale: 'en-US',
  style: 'long',
});
// → "2 days ago"

formatRelative(Temporal.Instant.from('2026-03-21T10:00:45Z'), {
  base,
  locale: 'de-DE',
  numeric: 'auto',
});
// → "in 45 Sekunden"
```

## Dynamic Locale Selection

```ts
function formatUserTime(time: Temporal.Instant, userLocale: string, userTz: string) {
  return formatHuman(time, {
    pattern: 'long',
    locale: userLocale,
    tz: userTz,
  });
}

console.log(formatUserTime(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'fr-FR', 'Europe/Paris'));
// → "samedi 21 mars 2026 à 11:15:30"

console.log(formatUserTime(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'es-ES', 'Europe/Madrid'));
// → "sábado, 21 de marzo de 2026, 11:15:30"
```
