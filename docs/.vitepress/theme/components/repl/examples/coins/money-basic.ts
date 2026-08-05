export const moneyBasicExample = {
  code: `import { USD, money, toDecimal, toJSON } from '@vielzeug/coins'

const price = money('19.99', USD)
const stored = money(1999n, USD, { unit: 'minor' })

console.log(toDecimal(price))
console.log(stored.amount)
console.log(toJSON(price))`,
  name: 'money - Decimal and minor-unit construction',
};
