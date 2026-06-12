export const wrappersAndDefaultsExample = {
  code: `// optional(), nullable(), default(), catch() — missing-value semantics
import { s } from '@vielzeug/spell'

// optional: accepts undefined, passes through validation otherwise
const Nickname = s.string().min(2).optional().default('Guest')

console.log(Nickname.parse(undefined))  // 'Guest'
console.log(Nickname.parse('Ada'))      // 'Ada'

// nullable: accepts null explicitly
const Bio = s.string().max(200).nullable()

console.log(Bio.parse(null))            // null
console.log(Bio.parse('Loves types'))   // 'Loves types'

// nullish: accepts both null and undefined
const Avatar = s.string().url().nullish()

console.log(Avatar.parse(null))         // null
console.log(Avatar.parse(undefined))    // undefined

// required(): strips undefined without removing null
const NullableButRequired = s.string().optional().nullable().required()
console.log(NullableButRequired.parse(null))   // null
console.log(NullableButRequired.safeParse(undefined).success) // false

// catch(): returns a fallback when validation fails — never throws
const Port = s.number().int().min(1).max(65535).catch(3000)
console.log(Port.parse(8080))           // 8080
console.log(Port.parse('not-a-port'))   // 3000`,
  name: 'Wrappers & Defaults',
};
