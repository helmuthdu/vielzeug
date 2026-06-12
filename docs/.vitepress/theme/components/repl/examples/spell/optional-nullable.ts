export const optionalNullableExample = {
  code: `// Preserve defaults and validators while tightening undefined away with required().
import { s } from '@vielzeug/spell'

const DisplayName = s.string().trim().min(2).optional().default('Guest').nullable()
const RequiredDisplayName = DisplayName.required()

console.log('default for undefined:', DisplayName.parse(undefined))
console.log('null stays null:', DisplayName.parse(null))

const short = RequiredDisplayName.safeParse('A')
console.log('short name accepted:', short.success)

const missing = RequiredDisplayName.safeParse(undefined)
console.log('undefined accepted after required():', missing.success)

console.log('null accepted after required():', RequiredDisplayName.parse(null))`,
  name: 'Optional and Nullable Fields',
};
