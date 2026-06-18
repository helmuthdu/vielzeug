export const asyncValidateExample = {
  code: `// validate() accepts sync or async rules in one method.
// Use parseAsync() when any rule in the schema returns a Promise.
import { s } from '@vielzeug/spell'

// Simulated async check (e.g. database lookup)
function isUsernameAvailable(name) {
  return new Promise(resolve => setTimeout(() => resolve(name !== 'taken'), 50))
}

const UsernameSchema = s.string()
  .min(3)
  .validate(async (name) => {
    const available = await isUsernameAvailable(name)
    return available || 'Username is already taken'
  })

// Must use parseAsync() when any validate() callback is async
const ok = await UsernameSchema.safeParseAsync('alice')
console.log('alice:', ok.success ? 'available' : ok.error.issues[0].message)

const fail = await UsernameSchema.safeParseAsync('taken')
console.log('taken:', fail.success ? 'available' : fail.error.issues[0].message)

const tooShort = await UsernameSchema.safeParseAsync('ab')
console.log('ab:', tooShort.success ? 'available' : tooShort.error.issues[0].message)`,
  name: 'Async Validation',
};
