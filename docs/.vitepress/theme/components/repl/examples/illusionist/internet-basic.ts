export const internetBasicExample = {
  code: `import { createIllusion } from '@vielzeug/illusionist'
import { en } from '@vielzeug/illusionist/locales'

const illusion = createIllusion({ seed: 12345, locale: en })

console.log(illusion.internet.email())
console.log(illusion.internet.username())
console.log(illusion.internet.url())
console.log(illusion.internet.ip())
console.log(illusion.internet.ip(6))
console.log(illusion.internet.mac())`,
  name: 'internet - Emails, URLs, and network addresses',
};
