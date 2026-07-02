export const moneyBasicExample = {
  code: `// Create Money values from strings, numbers, and raw minor units
import { money, toDecimal, toJSON } from '@vielzeug/coins'

// From decimal string — lossless, preferred
const price = money('1234.56', 'USD')
console.log('price:', price)
// → { amount: 123456n, currency: 'USD' }

// From number — IEEE-754 applies; prefer strings for exact amounts
const fromNum = money(19.99, 'USD')
console.log('from number:', fromNum)

// From bigint — minor units passed as-is (e.g. zero accumulator)
const empty = money(0n, 'USD')
console.log('zero USD:', empty)  // { amount: 0n, currency: 'USD' }

const rawCents = money(100n, 'USD')
console.log('from bigint:', rawCents)

// Zero-decimal currency (JPY — amounts are whole yen)
const yen = money('1234', 'JPY')
console.log('yen:', yen)

// Three-decimal currency (KWD)
const kwd = money('1.234', 'KWD')
console.log('KWD:', kwd)

// Back to decimal string
console.log('toDecimal:', toDecimal(price))   // '1234.56'
console.log('toJSON:', toJSON(price))         // { amount: '123456', currency: 'USD' }

// Invalid currency throws InvalidCurrencyError
try {
  money('1.00', 'NOTREAL')
} catch (e) {
  console.log('error:', e.message)
}`,
  name: 'Create and inspect Money values',
};
