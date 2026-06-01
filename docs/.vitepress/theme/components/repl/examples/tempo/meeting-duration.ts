export const meetingDurationExample = {
  code: `import { difference, parseInstant, timeDiff, within } from '@vielzeug/tempo'

const start = parseInstant('2026-03-21T10:00:00Z')
const end = parseInstant('2026-03-21T12:45:00Z')

// Two Instants with sub-day units — no tz needed
const duration = difference(start, end, {
  largestUnit: 'hour',
  smallestUnit: 'minute',
})

console.log('Duration ISO:', duration.toString())
console.log('11:00 in range:', within(parseInstant('2026-03-21T11:00:00Z'), start, end))

// Human-readable largest-unit diff
const diff = timeDiff(start, end)
console.log('timeDiff:', diff.value, diff.unit)`,
  name: 'Meeting Duration',
};
