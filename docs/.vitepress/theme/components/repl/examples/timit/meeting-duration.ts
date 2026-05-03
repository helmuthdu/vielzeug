export const meetingDurationExample = {
  code: `import { difference, within } from '@vielzeug/timit'

const start = '2026-03-21T10:00:00Z'
const end = '2026-03-21T12:45:00Z'

const duration = difference(start, end, {
  largestUnit: 'hours',
  smallestUnit: 'minutes',
})

console.log('Duration ISO:', duration.toString())
console.log('11:00 in range:', within('2026-03-21T11:00:00Z', start, end))`,
  name: 'Meeting Duration',
};
