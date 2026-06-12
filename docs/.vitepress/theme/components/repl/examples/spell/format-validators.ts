export const formatValidatorsExample = {
  code: `// Standalone format validators — use without building a full schema.
import { isEmail, isNanoid, isUrl, isUuid } from '@vielzeug/spell'

// isXxx helpers return a plain boolean — no schema overhead.
console.log(isEmail('ada@example.com'))           // true
console.log(isEmail('not-an-email'))              // false

console.log(isUuid('550e8400-e29b-41d4-a716-446655440000'))  // true
console.log(isUuid('short'))                      // false

console.log(isUrl('https://vielzeug.dev'))        // true
console.log(isUrl('not a url'))                   // false

// isNanoid accepts an optional custom length argument.
console.log(isNanoid('V1StGXR8_Z5jdHi6B-myT'))   // true  (default 21 chars)
console.log(isNanoid('V1StGXR8_Z', 10))           // true  (custom 10 chars)
console.log(isNanoid('V1StGXR8_Z5jdHi6B-myT', 10)) // false (wrong length)

// Use inside s.string().check() for schema-integrated format checks.
import { s } from '@vielzeug/spell'

const Token = s.string().nanoid(16)
console.log(Token.safeParse('V1StGXR8_ZabCdeF').success)  // true
console.log(Token.safeParse('tooshort').success)           // false`,
  name: 'Format Validators',
};
