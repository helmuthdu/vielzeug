export const arithmeticBasicExample = {
  code: `import { USD, add, divide, money, multiply, subtract, toDecimalString } from '@vielzeug/coins'

const subtotal = add(money('12.50', USD), money('7.25', USD))
const taxed = multiply(subtotal, '1.08', { rounding: 'halfEven' })
const split = divide(taxed, '3', { rounding: 'floor' })

console.log(toDecimalString(subtract(subtotal, money('1.00', USD))) )
console.log(toDecimalString(taxed))
console.log(toDecimalString(split))`,
  name: 'Arithmetic - Exact decimal scaling',
};
