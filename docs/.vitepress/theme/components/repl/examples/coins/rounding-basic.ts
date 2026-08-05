export const roundingBasicExample = {
  code: `import { USD, money, round, toDecimal } from '@vielzeug/coins'

const value = money('1.55', USD)

console.log(toDecimal(round(value, { fractionDigits: 1, rounding: 'halfEven' })))
console.log(toDecimal(round(value, { fractionDigits: 1, rounding: 'towardZero' })))`,
  name: 'round - Explicit rounding policy',
};
