export const localeBasicExample = {
  code: `import { createIllusion } from '@vielzeug/illusionist'
import { en, de } from '@vielzeug/illusionist/locales'

const illusion = {
  en: createIllusion({ seed: 42, locale: en }),
  de: createIllusion({ seed: 42, locale: de })
};

console.log(illusion.en.person.fullName())
console.log(illusion.de.person.fullName())
console.log(illusion.en.location.city())
console.log(illusion.de.location.city())
console.log(illusion.en.date.month())
console.log(illusion.de.date.month())`,
  name: 'locales - English and German side-by-side',
};
