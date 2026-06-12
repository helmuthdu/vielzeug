---
title: 'Tempo Examples — Expiry Classification'
description: 'Certificate and token TTL bucketing with expires() and classify().'
---

## Expiry Classification

### Problem

Applications that manage certificates, tokens, and licenses need to display contextual status — not just "expired" or "valid", but graduated urgency levels like "expiring in 3 days" vs. "expiring in 3 months". Computing these thresholds manually is repetitive and error-prone.

### Solution

Use `expires()` to classify a date into named threshold buckets of your choosing. Use `classify()` when you need both the bucket name and the structured time difference in a single call.

```ts
import { classify, expires, humanize, nowInstant, parseInstant, timeDiff } from '@vielzeug/tempo';

const THRESHOLDS = {
  longExpired: { days: -30 }, // more than 30 days in the past
  expired: { days: 0 }, // any past date
  critical: { days: 3 }, // expires within 3 days
  warning: { days: 14 }, // expires within 14 days
  safe: { years: 10 }, // catch-all for far-future dates
} as const;

const certExpiry = parseInstant('2026-06-04T00:00:00Z');

// Single bucket name
expires(certExpiry, THRESHOLDS); // 'critical' | 'warning' | 'safe' | ... | null

// Bucket + structured diff in one call
const { key, diff } = classify(certExpiry, THRESHOLDS);
// key:  'critical'
// diff: { unit: 'day', value: 3 }

const label = `${key}: ${humanize(diff)} remaining`;
// → 'critical: 3 days remaining'
```

#### Deterministic Tests

Pass the optional `now` parameter to `expires()` to pin the reference time — this makes tests completely deterministic regardless of when they run.

```ts
import { expires, parseInstant } from '@vielzeug/tempo';

const pinnedNow = parseInstant('2026-06-01T00:00:00Z');

expires(parseInstant('2026-05-01T00:00:00Z'), THRESHOLDS, {}, pinnedNow); // 'longExpired'
expires(parseInstant('2026-05-25T00:00:00Z'), THRESHOLDS, {}, pinnedNow); // 'expired'
expires(parseInstant('2026-06-03T00:00:00Z'), THRESHOLDS, {}, pinnedNow); // 'critical'
expires(parseInstant('2026-06-10T00:00:00Z'), THRESHOLDS, {}, pinnedNow); // 'warning'
expires(parseInstant('2030-01-01T00:00:00Z'), THRESHOLDS, {}, pinnedNow); // 'safe'
```

#### UI Badge Component

Combine `classify()` with a component to render a contextual status badge:

```tsx
import { classify, humanize, parseInstant } from '@vielzeug/tempo';

const CERT_THRESHOLDS = {
  expired: { days: 0 },
  critical: { days: 7 },
  warning: { days: 30 },
  safe: { years: 100 },
} as const;

function CertBadge({ expiresAt }: { expiresAt: string }) {
  const { key, diff } = classify(parseInstant(expiresAt), CERT_THRESHOLDS);

  const label =
    key === 'expired' ? `Expired ${humanize(diff)} ago` : key === null ? 'Unknown' : `${humanize(diff)} remaining`;

  return <span className={`badge badge--${key ?? 'unknown'}`}>{label}</span>;
}
```

### Pitfalls

- `expires()` returns `null` when `diff > max threshold`. Always handle the `null` case when the thresholds don't form a catch-all.
- Thresholds are compared after ascending sort — overlapping ranges always resolve to the most negative matching threshold.
- `expires()` uses approximate millisecond constants for month/year thresholds; use `classify()` + `timeDiff()` for calendar-accurate display values.
- For `PlainDate` or `PlainDateTime` inputs, pass `options.tz` or `expires()` throws.

### Related

- [API Reference — `expires()`](/tempo/api#expires-date-thresholds-options-k--null)
- [API Reference — `classify()`](/tempo/api#classify-date-thresholds-options-key-k--null-diff-timediffresult)
- [API Reference — `timeDiff()`](/tempo/api#timediff-a-b-options-timediffresult)
