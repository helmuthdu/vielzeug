export const commerceBasicExample = {
  code: `import { createIllusion } from '@vielzeug/illusionist'
import { en } from '@vielzeug/illusionist/locales'

const illusion = createIllusion({ seed: 12345, locale: en })

console.log(illusion.commerce.productName())
console.log(illusion.commerce.department())
console.log(illusion.commerce.price({ min: 10, max: 50, currency: 'EUR' }))
console.log(illusion.commerce.productDescription())`,
  name: 'commerce - Products, departments, and prices',
};
