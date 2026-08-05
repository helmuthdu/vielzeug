export const formatBasicExample = {
  code: `import { EUR, USD, format, formatParts, money } from '@vielzeug/coins'

const value = money('1234.56', USD)

console.log(format(value))
console.log(format(money('1234.56', EUR), { locale: 'de-DE' }))
console.log(formatParts(value))`,
  name: 'format - Locale presentation',
};
