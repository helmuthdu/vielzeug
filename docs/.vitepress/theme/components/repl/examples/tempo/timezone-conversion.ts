export const timezoneConversionExample = {
  code: `import { format, formatInstant, formatZoned, inTz, parse } from '@vielzeug/tempo'

// parse() auto-detects the type; 'instant' narrows the return type
const utc = parse('2026-03-21T10:15:30Z', 'instant')
const tokyo = inTz(utc, 'Asia/Tokyo')
const berlin = inTz(utc, 'Europe/Berlin')

console.log('UTC instant:', formatInstant(utc))
console.log('Tokyo zoned:', formatZoned(tokyo))
console.log('Berlin wall-clock:', format(berlin, { pattern: 'short', locale: 'de-DE' }))

// Re-projecting a ZonedDateTime: same instant, new wall-clock
const berlinToNY = inTz(berlin, 'America/New_York')
console.log('Berlin → New York:', berlinToNY.toString())`,

  name: 'Timezone Projection with inTz',
};
