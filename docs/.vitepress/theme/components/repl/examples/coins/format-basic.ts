export const formatBasicExample = {
  code: `// Format Money values as locale-aware currency strings
import { format, formatParts, money } from '@vielzeug/coins'

const price = money('1234.56', 'USD')

// Default: en-US locale, symbol style
console.log(format(price))                           // '$1,234.56'

// Locale options
console.log(format(price, { locale: 'de-DE' }))      // '1.234,56 $'
console.log(format(price, { locale: 'fr-FR' }))      // '1 234,56 $'

// Style options
console.log(format(price, { style: 'code' }))         // 'USD 1,234.56'
console.log(format(price, { style: 'name' }))         // '1,234.56 US dollars'
console.log(format(price, { style: 'narrowSymbol' })) // '$1,234.56' (compact)

// Custom fraction digits
console.log(format(price, { maximumFractionDigits: 0 }))   // '$1,235'
console.log(format(price, { minimumFractionDigits: 0 }))   // '$1,234.56'

// Zero-decimal currency
console.log(format(money('1234', 'JPY')))             // '¥1,234'

// Negative amounts
console.log(format(money('-99.99', 'USD')))           // '-$99.99'

// Structured parts for custom rendering
const parts = formatParts(money('9.99', 'USD'))
parts.forEach(p => console.log(p.type.padEnd(10), '→', JSON.stringify(p.value)))
// currency   → '$'
// integer    → '9'
// decimal    → '.'
// fraction   → '99'`,
  name: 'Locale-aware formatting',
};
