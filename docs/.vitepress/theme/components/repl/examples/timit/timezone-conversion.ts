export const timezoneConversionExample = {
  code: `import { toZoned, formatIso, formatRange } from '@vielzeug/timit'

const utc = '2026-03-21T10:15:30Z'
const tokyo = toZoned(utc, { tz: 'Asia/Tokyo' })
const berlin = toZoned(utc, { tz: 'Europe/Berlin' })

console.log('UTC ISO:', formatIso(utc))
console.log('Tokyo:', tokyo.toString())
console.log('Berlin:', berlin.toString())
console.log('Range:', formatRange(tokyo, berlin, { pattern: 'short', locale: 'en-US' }))`,

  name: 'Timezone Conversion',
};
