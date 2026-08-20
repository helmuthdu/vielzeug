export const financeBasicExample = {
  code: `import { createIllusion } from '@vielzeug/illusionist'
import { en } from '@vielzeug/illusionist/locales'

const illusion = createIllusion({ seed: 12345, locale: en })

console.log(illusion.finance.iban())
console.log(illusion.finance.iban('DE'))
console.log(illusion.finance.bic())
console.log(illusion.finance.creditCardNumber('visa'))
console.log(illusion.finance.creditCardCVV('amex'))
console.log(illusion.finance.ethereumAddress())`,
  name: 'finance - IBANs, cards, BICs, and crypto addresses',
};
