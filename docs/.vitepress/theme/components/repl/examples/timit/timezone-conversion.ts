export const timezoneConversionExample = {
  code: `import { formatInstant, formatRange, formatZoned, toZoned } from '@vielzeug/timit'

const utc = Temporal.Instant.from('2026-03-21T10:15:30Z')
const tokyo = toZoned(utc, { tz: 'Asia/Tokyo' })
const berlin = toZoned(utc, { tz: 'Europe/Berlin' })

console.log('UTC instant:', formatInstant(utc))
console.log('Tokyo zoned:', formatZoned(utc, { tz: 'Asia/Tokyo' }))
console.log('Tokyo:', tokyo.toString())
console.log('Berlin:', berlin.toString())
console.log('Range:', formatRange(tokyo, berlin, { pattern: 'short', locale: 'en-US', tz: 'UTC' }))`,

  name: 'Timezone Conversion',
};
