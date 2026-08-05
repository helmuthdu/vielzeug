export const allocationBasicExample = {
  code: `import { USD, allocate, money, sum, toDecimal } from '@vielzeug/coins'

const weighted = allocate(money('10.00', USD), ['1', '2', '1'])
const even = allocate(money(5n, USD, { unit: 'minor' }), 2)

console.log(weighted.map(toDecimal))
console.log(toDecimal(sum(weighted, { currency: USD })))
console.log(even.map(value => value.amount))`,
  name: 'allocate - Preserve every minor unit',
};
