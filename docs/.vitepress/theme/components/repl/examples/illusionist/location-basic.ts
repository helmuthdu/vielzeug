export const locationBasicExample = {
  code: `import { createIllusion } from '@vielzeug/illusionist'
import { en } from '@vielzeug/illusionist/locales'

const illusion = createIllusion({ seed: 12345, locale: en })

console.log(illusion.location.city())
console.log(illusion.location.streetAddress())
console.log(illusion.location.zipCode())
console.log(illusion.location.state())
console.log(illusion.location.country())
console.log(illusion.location.latitude())
console.log(illusion.location.longitude())`,
  name: 'location - Addresses, regions, and coordinates',
};
