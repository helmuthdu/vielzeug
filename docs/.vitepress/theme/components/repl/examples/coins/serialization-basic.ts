export const serializationBasicExample = {
  code: `// Serialization and type conversion — JSON, decimal, and number
import { fromJSON, money, toDecimal, toJSON, toNumber } from '@vielzeug/coins'

const price = money('1234.56', 'USD')

// --- toJSON / fromJSON ---
// JSON-safe serialization (bigint → string)
const json = toJSON(price)
console.log('toJSON:', json)
// → { amount: '123456', currency: 'USD' }

// JSON.stringify works because amount is now a string
console.log('JSON.stringify:', JSON.stringify(json))
// → '{"amount":"123456","currency":"USD"}'

// Round-trip: reconstruct exact Money from JSON
const restored = fromJSON(json)
console.log('fromJSON restored:', restored)
console.log('round-trip match:', restored.amount === price.amount)  // true

// --- toDecimal ---
// Human-readable decimal string — lossless
console.log('\\ntoDecimal:', toDecimal(price))           // '1234.56'
console.log('small amount:', toDecimal(money(5n, 'USD')))  // '0.05'
console.log('negative:', toDecimal(money('-50.00', 'USD'))) // '-50.00'
console.log('zero-decimal (JPY):', toDecimal(money(1234n, 'JPY'))) // '1234'
console.log('three-decimal (KWD):', toDecimal(money('1.234', 'KWD'))) // '1.234'

// Round-trip via toDecimal
const original = money('9876.54', 'USD')
console.log('\\nDecimal round-trip:', money(toDecimal(original), 'USD').amount === original.amount)

// --- toNumber ---
// Lossy conversion to float — only for display/charting, not arithmetic
console.log('\\ntoNumber:', toNumber(price))  // 1234.56
console.log('toNumber JPY:', toNumber(money(1234n, 'JPY')))  // 1234

// fromJSON rejects invalid input
try {
  fromJSON({ amount: '1.5', currency: 'USD' })
} catch (e) {
  console.log('\\nfromJSON float error:', e.message)
}`,
  name: 'Serialization (toJSON, fromJSON, toDecimal, toNumber)',
};
