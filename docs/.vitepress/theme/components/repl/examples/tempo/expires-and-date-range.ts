export const expiresAndDateRangeExample = {
  code: `import { classify, dateRange, expires, humanize, now, nowInstant, parseInstant, parseZoned, recurrence, shift, timeDiff } from '@vielzeug/tempo'

// --- expires() ---
const THRESHOLDS = {
  longExpired: { days: -30 },
  expired:     { days: 0 },
  critical:    { days: 3 },
  warning:     { days: 14 },
  safe:        { years: 100 },
}

// Use tempo helpers — no Temporal.* needed
const past  = shift(now('UTC'), { hours: -1 }).toInstant()
const soon  = shift(now('UTC'), { hours: 48 }).toInstant()
const later = shift(now('UTC'), { days: 10 }).toInstant()

console.log('past:',  expires(past, THRESHOLDS))   // 'expired'
console.log('soon:',  expires(soon, THRESHOLDS))   // 'critical'
console.log('later:', expires(later, THRESHOLDS))  // 'warning'

// --- classify() = expires() + timeDiff() in one call ---
const { key, diff } = classify(soon, THRESHOLDS)
console.log('key:', key, '|', humanize(diff))                    // 'critical | 2 days'
console.log('localized:', humanize(diff, { locale: 'ar-EG' }))  // Arabic numerals

// --- timeDiff() ---
const a = parseInstant('2026-01-01T00:00:00Z')
const b = parseInstant('2027-06-15T00:00:00Z')
console.log('timeDiff:', timeDiff(a, b).value, timeDiff(a, b).unit) // 1 year

// --- dateRange() — tz inferred from ZonedDateTime, no options needed ---
const start = parseZoned('2026-03-01T00:00:00[America/New_York]')
const end   = parseZoned('2026-03-05T00:00:00[America/New_York]')

for (const day of dateRange(start, end, { days: 1 })) {
  console.log(day.toPlainDate().toString(), day.timeZoneId)
}

// --- recurrence() — tz inferred from ZonedDateTime start ---
const weekly = recurrence(start, { frequency: 'weekly', count: 3 })
for (const date of weekly) {
  console.log('weekly:', date.toPlainDate().toString())
}`,
  name: 'Expires & Date Range',
};
