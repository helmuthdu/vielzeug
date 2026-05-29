export const dstSafeArithmeticExample = {
  code: `import { formatInstant, shift } from '/tempo'

const beforeDst = Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]')
const plusOneHour = shift(beforeDst, { hours: 1 })

console.log('Before:', beforeDst.toString())
console.log('After +1h:', plusOneHour.toString())
console.log('Instant:', formatInstant(plusOneHour))`,

  name: 'DST-Safe Arithmetic',
};
