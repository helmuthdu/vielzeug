export const formatValidatorsExample = {
  code: `import { s } from '@vielzeug/spell'
import { isEmail, isUuid } from '@vielzeug/spell/predicates'

console.log(isEmail('ada@example.com'))
console.log(isEmail('not-an-email'))
console.log(isUuid('550e8400-e29b-41d4-a716-446655440000'))
console.log(isUuid('short'))

const UserId = s.string().uuid()
console.log(UserId.safeParse('550e8400-e29b-41d4-a716-446655440000').success)`,
  name: 'Format Predicates',
};
