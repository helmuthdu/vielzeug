---
title: Locale Formatting
description: Formatting times for different locales and languages with Timit.
---

# Locale Formatting

Format times respecting user locale, language, and timezone.

## Basic Locale Formatting

```ts
import { t } from '@vielzeug/timit';

const time = '2026-03-21T10:15:30Z';

// English (US)
t.formatHuman(time, { pattern: 'short', locale: 'en-US', tz: 'UTC' });
// → "3/21/2026, 10:15 AM"

// German
t.formatHuman(time, { pattern: 'short', locale: 'de-DE', tz: 'Europe/Berlin' });
// → "21.3.2026, 11:15"

// Japanese
t.formatHuman(time, { pattern: 'short', locale: 'ja-JP', tz: 'Asia/Tokyo' });
// → "2026/3/21 19:15"
```

## All Format Patterns

```ts
const time = '2026-03-21T10:15:30Z';

const patterns = ['short', 'long', 'date-only', 'time-only'] as const;

for (const pattern of patterns) {
  const formatted = t.formatHuman(time, { pattern, locale: 'en-GB', tz: 'UTC' });
  console.log(`${pattern.padEnd(10)} ${formatted}`);
}

console.log(`iso       ${t.formatISO(time)}`);

// Output:
// short      21/03/2026, 10:15
// long       Saturday, 21 March 2026 at 10:15:30
// iso        2026-03-21T10:15:30Z
// date-only  21/03/2026
// time-only  10:15
```

## Advanced: Escape Hatch to Intl

Use the `intl` option for custom `Intl.DateTimeFormatOptions`:

```ts
t.formatHuman(time, {
  locale: 'de-DE',
  tz: 'Europe/Berlin',
  pattern: 'short',
  intl: {
    weekday: 'long',
    hour12: false,
  },
});
// → "Samstag, 21.3.2026, 11:15"
```

## Range Formatting

Format a span of time:

```ts
const start = '2026-03-21T10:00:00Z';
const end = '2026-03-21T12:00:00Z';

t.formatRange(start, end, {
  pattern: 'short',
  locale: 'en-US',
  tz: 'America/New_York',
});
// → "3/21/2026, 6:00 AM – 8:00 AM"
```

## Dynamic Locale Selection

```ts
function formatUserTime(time: string, userLocale: string, userTz: string) {
  return t.formatHuman(time, {
    pattern: 'long',
    locale: userLocale,
    tz: userTz,
  });
}

console.log(formatUserTime('2026-03-21T10:15:30Z', 'fr-FR', 'Europe/Paris'));
// → "samedi 21 mars 2026 à 11:15:30"

console.log(formatUserTime('2026-03-21T10:15:30Z', 'es-ES', 'Europe/Madrid'));
// → "sábado, 21 de marzo de 2026, 11:15:30"
```
