export const dstSafeArithmeticExample = {
  code: `import { add, formatIso } from '@vielzeug/timit'

const beforeDst = '2026-03-08T01:30:00-05:00[America/New_York]'
const plusOneHour = add(beforeDst, { hours: 1 })

console.log('Before:', beforeDst)
console.log('After +1h:', plusOneHour.toString())
console.log('ISO:', formatIso(plusOneHour))`,

  name: 'DST-Safe Arithmetic',
};
