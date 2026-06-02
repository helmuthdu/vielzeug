export const dstSafeArithmeticExample = {
  code: `import { formatInstant, parseInstant, parseZoned, shift } from '@vielzeug/tempo'

const beforeDst = parseZoned('2026-03-08T01:30:00-05:00[America/New_York]')
const plusOneHour = shift(beforeDst, { hours: 1 })

console.log('Before:', beforeDst.toString())
console.log('After +1h:', plusOneHour.toString())
// shift() always returns ZonedDateTime — call .toInstant() if you need an Instant
console.log('As Instant:', plusOneHour.toInstant().toString())
console.log('Formatted:', formatInstant(plusOneHour))

// Works with Instant input too (tz required)
const instant = parseInstant('2026-03-08T06:30:00Z')
const shifted = shift(instant, { hours: 2 }, { tz: 'America/New_York' })
console.log('Shifted ZDT:', shifted.toString())
console.log('Back to Instant:', shifted.toInstant().toString())`,

  name: 'DST-Safe Arithmetic',
};
