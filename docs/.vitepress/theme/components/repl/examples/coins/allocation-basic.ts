export const allocationBasicExample = {
  code: `import { USD, allocate, money, sum, toDecimalString } from '@vielzeug/coins'

const weighted = allocate(money('10.00', USD), ['1', '2', '1'])
const even = allocate(money(5n, USD, { unit: 'minor' }), 2)

console.log(weighted.map(toDecimalString))
console.log(toDecimalString(sum(weighted)))
console.log(even.map(value => value.amount))`,
  name: 'allocate - Preserve every minor unit',
};
