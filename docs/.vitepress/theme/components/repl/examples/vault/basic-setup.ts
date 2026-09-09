export const basicSetupExample = {
  code: `import { s } from '@vielzeug/spell'
import { table } from '@vielzeug/vault'
import { createLocalStorage } from '@vielzeug/vault/local-storage'

const UserSchema = s.object({ email: s.string().email(), id: s.number(), name: s.string() })
const schema = {
  users: table('id'),
}

const db = createLocalStorage({
  name: 'demo',
  schema,
  codecs: { users: UserSchema },
})

await db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com' })
await db.put('users', { id: 2, name: 'Bob', email: 'bob@example.com' })

console.log('Get user 1:', await db.get('users', 1))
console.log('All users:', await db.getAll('users'))
console.log('Count:', await db.count('users'))`,
  name: 'Basic Setup - Initialize Vault',
};
