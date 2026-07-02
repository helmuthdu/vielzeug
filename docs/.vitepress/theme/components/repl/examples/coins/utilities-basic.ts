export const utilitiesBasicExample = {
  code: `// withAmount, isMoney, validateCurrencyCode, getCurrencyDecimals
import { getCurrencyDecimals, InvalidCurrencyError, isMoney, money, toDecimal, validateCurrencyCode, withAmount } from '@vielzeug/coins'

// withAmount: create a new Money with a different raw bigint, same currency
const price = money('9.99', 'USD')
const doubled = withAmount(price, price.amount * 2n)
console.log('Doubled (raw bigint):', toDecimal(doubled))  // '19.98'

// Useful when performing low-level bigint math outside the library
const rawDiscount = (price.amount * 15n) / 100n  // 15% discount, truncated
const discounted = withAmount(price, price.amount - rawDiscount)
console.log('After 15% raw discount:', toDecimal(discounted))  // '8.49'

// isMoney: type guard for unknown/untrusted data
const fromApi: unknown = { amount: 1999n, currency: 'USD' }
if (isMoney(fromApi)) {
  console.log('\\nValid Money from API:', toDecimal(fromApi), fromApi.currency)
}

// Rejects non-Money shapes
console.log('\\nisMoney checks:')
console.log('  plain object:', isMoney({ amount: 100n, currency: 'USD' }))    // true
console.log('  float amount:', isMoney({ amount: 9.99, currency: 'USD' }))    // false
console.log('  missing key: ', isMoney({ amount: 100n }))                     // false
console.log('  null:        ', isMoney(null))                                 // false

// validateCurrencyCode: pre-validate a code before constructing Money
console.log('\\nvalidateCurrencyCode:')
console.log('  USD:', validateCurrencyCode('USD'))   // 'USD'
console.log('  JPY:', validateCurrencyCode('JPY'))   // 'JPY'

try {
  validateCurrencyCode('FAKE')
} catch (e) {
  if (e instanceof InvalidCurrencyError) {
    console.log('  FAKE throws InvalidCurrencyError, code:', e.code)  // 'FAKE'
  }
}

// getCurrencyDecimals: query minor-unit precision for a currency
console.log('\\ngetCurrencyDecimals:')
console.log('  USD:', getCurrencyDecimals('USD'))  // 2
console.log('  JPY:', getCurrencyDecimals('JPY'))  // 0
console.log('  KWD:', getCurrencyDecimals('KWD'))  // 3

// Use it to build a custom formatter or display hint
const currencies = ['USD', 'JPY', 'KWD', 'EUR']
for (const code of currencies) {
  const decimals = getCurrencyDecimals(code)
  console.log(\`  \${code}: \${decimals} decimal place\${decimals === 1 ? '' : 's'}\`)
}`,
  name: 'Utilities (withAmount, isMoney, validateCurrencyCode, getCurrencyDecimals)',
};
