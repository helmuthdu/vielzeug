export const basicSetupExample = {
  code: `import { createLocalStorage, table } from '@vielzeug/deposit'

const schema = {
  users: table('id'),
}

const db = createLocalStorage('demo', schema)

await db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com' })
await db.put('users', { id: 2, name: 'Bob', email: 'bob@example.com' })

console.log('Get user 1:', await db.get('users', 1))
console.log('All users:', await db.getAll('users'))
console.log('Count:', await db.count('users'))`,
  name: 'Basic Setup - Initialize Deposit',
};
