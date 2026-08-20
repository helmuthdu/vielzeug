export const personBasicExample = {
  code: `import { createIllusion } from '@vielzeug/illusionist'
import { en } from '@vielzeug/illusionist/locales'

const illusion = createIllusion({ seed: 12345, locale: en })

console.log(illusion.person.fullName())
console.log(illusion.person.firstName())
console.log(illusion.person.lastName())
console.log(illusion.person.jobTitle())
console.log(illusion.person.gender())`,
  name: 'person - Names, gender, and job titles',
};
