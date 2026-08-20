export const determinismBasicExample = {
  code: `import { createIllusion } from '@vielzeug/illusionist'
import { en } from '@vielzeug/illusionist/locales'

const a = createIllusion({ seed: 'test-fixture', locale: en })
const b = createIllusion({ seed: 'test-fixture', locale: en })

console.log(a.person.fullName() === b.person.fullName())
console.log(a.internet.email() === b.internet.email())

a.dispose()
b.dispose()`,
  name: 'seed - Deterministic output from the same seed',
};
