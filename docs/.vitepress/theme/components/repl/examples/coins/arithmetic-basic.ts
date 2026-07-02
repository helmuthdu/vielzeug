export const arithmeticBasicExample = {
  code: `// Arithmetic with bigint precision — no floating-point drift
import { add, divide, money, multiply, subtract, toDecimal } from '@vielzeug/coins'

const price = money('100.00', 'USD')   // $100.00 = 10000 cents
const tax   = money('8.50',  'USD')   //   $8.50 =  850 cents

console.log('add:     ', toDecimal(add(price, tax)))      // '108.50'
console.log('subtract:', toDecimal(subtract(price, tax))) // '91.50'

// Scalar multiply — use string factors for lossless fractions
console.log('×1.5:    ', toDecimal(multiply(price, '1.5')))  // '150.00'
console.log('×0.339:  ', toDecimal(multiply(price, '0.339'))) // '33.90'

// Divide with explicit rounding modes
const third = divide(money('10.00', 'USD'), 3)
console.log('÷3 default (half-away-from-zero):', toDecimal(third)) // '3.33'
console.log('÷3 ceiling:',  toDecimal(divide(money('10.00', 'USD'), 3, 'ceiling')))  // '3.34'
console.log('÷3 half-even:', toDecimal(divide(money('10.00', 'USD'), 3, 'half-even'))) // '3.33'

// Percentage via multiply — 10% = × '0.1', 8.5% = × '0.085'
console.log('\\n10% of $100:    ', toDecimal(multiply(price, '0.1')))                       // '10.00'
console.log('8.5% of $199.99:', toDecimal(multiply(money('199.99', 'USD'), '0.085')))  // '17.00'

// Float arithmetic comparison
console.log('\\nFloat drift (bad):', 0.1 + 0.2)  // 0.30000000000000004
const a = money('0.10', 'USD')
const b = money('0.20', 'USD')
console.log('bigint exact (good):', toDecimal(add(a, b)))  // '0.30'`,
  name: 'Arithmetic and rounding modes',
};
