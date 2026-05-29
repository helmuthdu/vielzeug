export const expiresAndDateRangeExample = {
  code: `import { dateRange, expires, timeDiff } from '/tempo'

// --- expires() ---
const past    = Temporal.Now.instant().subtract({ hours: 1 })
const soon    = Temporal.Now.instant().add({ hours: 48 })
const later   = Temporal.Now.instant().add({ days: 30 })
const forever = Temporal.Instant.from('9999-12-31T00:00:00Z')

console.log('past:',    expires(past))    // EXPIRED
console.log('soon:',    expires(soon))    // SOON   (within default 7-day window)
console.log('later:',   expires(later))   // LATER
console.log('forever:', expires(forever)) // NEVER

// Custom window: anything beyond 1 day is LATER
console.log('soon with 1d window:', expires(soon, 1)) // LATER

// --- timeDiff() ---
const a = Temporal.Instant.from('2026-01-01T00:00:00Z')
const b = Temporal.Instant.from('2027-06-15T00:00:00Z')
const diff = timeDiff(a, b)
console.log('timeDiff:', diff.value, diff.unit) // 1 year

// --- dateRange() ---
const days = dateRange(
  Temporal.ZonedDateTime.from('2026-03-01T00:00:00[UTC]'),
  Temporal.ZonedDateTime.from('2026-03-05T00:00:00[UTC]'),
  { days: 1 },
  { tz: 'UTC' },
)

for (const day of days) {
  console.log(day.toPlainDate().toString())
}`,
  name: 'Expires & Date Range',
};
