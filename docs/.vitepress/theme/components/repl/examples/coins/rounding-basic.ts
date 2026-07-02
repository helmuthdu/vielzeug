export const roundingBasicExample = {
  code: `// roundTo — round to fewer decimal places for display
import { money, roundTo, toDecimal } from '@vielzeug/coins'

// money(bigint) — minor units passed as-is
const price = money(123456n, 'USD')
console.log('money(bigint) USD:', price)   // { amount: 123456n, currency: 'USD' }
console.log('decimal:', toDecimal(price))   // '1234.56'

const yen = money(1234n, 'JPY')
console.log('money(bigint) JPY:', yen)     // { amount: 1234n, currency: 'JPY' }

// roundTo — reduce decimal places for display
const total = money('1234.56', 'USD')

// Round to 0 decimal places (whole dollars)
const wholeDollars = roundTo(total, 0)
console.log('whole dollars:', wholeDollars)  // { amount: 1235n, currency: 'USD' }
console.log('decimal:', toDecimal(wholeDollars))  // '1235'

// Round to 1 decimal place
const oneDecimal = roundTo(total, 1)
console.log('1 decimal:', toDecimal(oneDecimal))  // '1234.6'

// roundTo is a no-op when places === currency decimals
console.log('no-op:', roundTo(total, 2) === total)  // true

// Explicit rounding modes
console.log('floor:', toDecimal(roundTo(total, 0, 'floor')))    // '1234'
console.log('ceiling:', toDecimal(roundTo(total, 0, 'ceiling'))) // '1235'

// Negative amounts
const debt = money('-1234.56', 'USD')
console.log('negative floor:', toDecimal(roundTo(debt, 0, 'floor')))    // '-1235'
console.log('negative ceiling:', toDecimal(roundTo(debt, 0, 'ceiling'))) // '-1234'

// RangeError when places is out of range
try {
  roundTo(total, 3)  // USD only has 2 decimal places
} catch (e) {
  console.log('error:', e.message)
}`,
  name: 'Rounding Money values',
};
