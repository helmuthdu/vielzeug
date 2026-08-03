export const asyncValidateExample = {
  code: `// checkAsync() declares asynchronous domain rules.
// Use safeParseAsync() or parseAsync() for schemas containing async checks.
import { s } from '@vielzeug/spell'

// Simulated async check (e.g. database lookup)
function isUsernameAvailable(name) {
  return new Promise(resolve => setTimeout(() => resolve(name !== 'taken'), 50))
}

const UsernameSchema = s.string()
  .min(3)
  .checkAsync(async (name) => {
    const available = await isUsernameAvailable(name)
    return available || 'Username is already taken'
  })

// Async checks require safeParseAsync() or parseAsync()
const ok = await UsernameSchema.safeParseAsync('alice')
console.log('alice:', ok.success ? 'available' : ok.error.issues[0].message)

const fail = await UsernameSchema.safeParseAsync('taken')
console.log('taken:', fail.success ? 'available' : fail.error.issues[0].message)

const tooShort = await UsernameSchema.safeParseAsync('ab')
console.log('ab:', tooShort.success ? 'available' : tooShort.error.issues[0].message)`,
  name: 'Async Validation',
};
