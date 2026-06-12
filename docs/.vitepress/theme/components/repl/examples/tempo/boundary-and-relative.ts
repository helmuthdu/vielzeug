export const boundaryAndRelativeExample = {
  code: `import { endOf, formatRelative, isBefore, isSame, parseInstant, startOf } from '@vielzeug/tempo'

// Snap to calendar boundaries (tz required for non-ZonedDateTime inputs)
const event = parseInstant('2026-03-21T10:15:30Z')

const dayStart = startOf(event, 'day', { tz: 'UTC' })
const dayEnd   = endOf(event,   'day', { tz: 'UTC' })
const weekStart = startOf(event, 'week', { tz: 'UTC', weekStartsOn: 1 })

console.log('Day start:',  dayStart.toString())
console.log('Day end:',    dayEnd.toString())
console.log('Week start:', weekStart.toString())

// Comparison helpers
const a = parseInstant('2026-03-21T10:00:00Z')
const b = parseInstant('2026-03-21T12:00:00Z')

console.log('a < b:', isBefore(a, b))
console.log('same day:', isSame(a, b, { unit: 'day', tz: 'UTC' }))

// Relative formatting with a pinned base
const base = parseInstant('2026-03-21T10:00:00Z')
console.log(formatRelative(b, { base, locale: 'en-US', numeric: 'always' }))
// → 'in 2 hours'
console.log(formatRelative(a, { base, locale: 'en-US' }))
// → 'now'`,

  name: 'Boundary & Relative Time',
};
