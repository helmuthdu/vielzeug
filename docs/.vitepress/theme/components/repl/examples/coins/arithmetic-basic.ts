export const arithmeticBasicExample = {
  code: `import { USD, add, divide, money, multiply, subtract, toDecimal } from '@vielzeug/coins'

const subtotal = add(money('12.50', USD), money('7.25', USD))
const taxed = multiply(subtotal, '1.08', { rounding: 'halfEven' })
const split = divide(taxed, '3', { rounding: 'floor' })

console.log(toDecimal(subtract(subtotal, money('1.00', USD))) )
console.log(toDecimal(taxed))
console.log(toDecimal(split))`,
  name: 'Arithmetic - Exact decimal scaling',
};
