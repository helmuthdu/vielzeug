export const meetingDurationExample = {
  code: `import { difference, within } from '@vielzeug/timit'

const start = Temporal.Instant.from('2026-03-21T10:00:00Z')
const end = Temporal.Instant.from('2026-03-21T12:45:00Z')

const duration = difference(start, end, {
  tz: 'UTC',
  largestUnit: 'hour',
  smallestUnit: 'minute',
})

console.log('Duration ISO:', duration.toString())
console.log('11:00 in range:', within(Temporal.Instant.from('2026-03-21T11:00:00Z'), start, end))`,
  name: 'Meeting Duration',
};
