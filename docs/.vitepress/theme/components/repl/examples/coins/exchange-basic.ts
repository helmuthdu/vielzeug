export const exchangeBasicExample = {
  code: `// Convert Money between currencies with exact bigint arithmetic
import { CurrencyMismatchError, InvalidCurrencyError, exchange, format, money } from '@vielzeug/coins'

const price = money('100.00', 'USD')

// Basic exchange — ExchangeRate.from/to are plain strings
const rate = { from: 'USD', rate: '0.92', to: 'EUR' }
const inEur = exchange(price, rate)
console.log('$100 →', format(inEur))   // '€92.00'

// Explicit rounding mode (sell vs buy rate)
const fractional = { from: 'USD', rate: '0.926', to: 'EUR' }
console.log('\\nRounding modes for rate 0.926:')
console.log(' default (half-away):', exchange(price, fractional).amount, 'cents')  // 9260n
console.log(' floor:             ', exchange(price, fractional, 'floor').amount)
console.log(' ceiling:           ', exchange(price, fractional, 'ceiling').amount)

// Error cases
try {
  exchange(price, { from: 'USD', rate: '-0.92', to: 'EUR' })
} catch (e) {
  console.log('\\nnegative rate error:', e.message)
}

try {
  exchange(price, { from: 'USD', rate: '1.0', to: 'FAKE' })
} catch (e) {
  if (e instanceof InvalidCurrencyError) {
    console.log('invalid rate.to error, code:', e.code)  // 'FAKE'
  }
}

try {
  exchange(money('100.00', 'EUR'), rate)
} catch (e) {
  if (e instanceof CurrencyMismatchError) {
    console.log('mismatch error, expected:', e.expected, 'received:', e.received)
  }
}

// Multi-currency display
const rates = [
  { from: 'USD', rate: '0.92',  to: 'EUR' },
  { from: 'USD', rate: '0.79',  to: 'GBP' },
  { from: 'USD', rate: '149.5', to: 'JPY' },
]

console.log('\\n$50 in multiple currencies:')
const fifty = money('50.00', 'USD')
for (const r of rates) {
  console.log(' ', format(exchange(fifty, r)))
}
// €46.00   £39.50   ¥7,475`,
  name: 'Currency exchange',
};
