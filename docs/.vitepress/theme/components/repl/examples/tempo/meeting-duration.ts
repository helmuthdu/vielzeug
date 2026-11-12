export const meetingDurationExample = {
  code: `import { difference, format, parse, shift, toInstant, toZoned } from '@vielzeug/tempo'

const local = parse('2026-03-21T10:00:00', { as: 'plainDateTime' })
const start = toInstant(local, { timeZone: 'America/New_York' })
const end = shift(start, { hours: 2 }, { timeZone: 'America/New_York' })

console.log('Duration:', difference({ end, largestUnit: 'hour', start }).toString())
console.log('New York:', format(end, { locale: 'en-US', pattern: 'short' }))
console.log('Berlin:', format(toZoned(end, { timeZone: 'Europe/Berlin' }), { locale: 'de-DE', pattern: 'short' }))`,
  name: 'Timezone-Aware Arithmetic and Formatting',
};
