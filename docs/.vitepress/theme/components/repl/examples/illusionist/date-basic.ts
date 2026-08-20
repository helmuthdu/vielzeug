export const dateBasicExample = {
  code: `import { createIllusion } from '@vielzeug/illusionist'
import { en } from '@vielzeug/illusionist/locales'

const illusion = createIllusion({ seed: 12345, locale: en })

console.log(illusion.date.past({ years: 2 }).toString())
console.log(illusion.date.future({ years: 1 }).toString())
console.log(illusion.date.recent({ days: 7 }).toString())
console.log(illusion.date.birthday({ minAge: 25, maxAge: 35 }).toString())
console.log(illusion.date.weekday())
console.log(illusion.date.month())`,
  name: 'date - Past, future, birthdays, and locale labels',
};
