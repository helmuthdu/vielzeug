export const meetingDurationExample = {
  code: `import { classifyExpiry, contains, difference, format, inTimeZone, parse, shift, toInstant } from '@vielzeug/tempo'

const local = parse('2026-03-21T10:00:00', { as: 'plainDateTime' })
const start = toInstant(local, { timeZone: 'America/New_York' })
const end = shift(start, { hours: 2 }, { timeZone: 'America/New_York' }).toInstant()
const check = parse('2026-03-21T11:00:00Z', { as: 'instant' })

console.log('Duration:', difference({ end, largestUnit: 'hour', start }).toString())
console.log('Contains check:', contains({ end, start, value: check }))
console.log('New York:', format(inTimeZone(start, 'America/New_York'), { locale: 'en-US', pattern: 'short' }))
console.log('Expiry:', classifyExpiry({ thresholds: { soon: { days: 3 } }, value: end }))`,
  name: 'Explicit Parsing and Timezone Arithmetic',
};
