export const crudOperationsExample = {
  code: `import { createLocalStorage, table } from '@vielzeug/vault'

const schema = {
  users: table('id'),
}

const db = createLocalStorage({ name: 'demo', schema })

await db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 })
await db.put('users', { id: 2, name: 'Bob', email: 'bob@example.com', age: 30 })
console.log('Created 2 users')

console.log('Get user 1:', await db.get('users', 1))
console.log('Count:', await db.count('users'))
console.log('isEmpty before clear:', await db.isEmpty('users')) // false

await db.update('users', 1, { age: 26, name: 'Alice Smith' })
console.log('Updated user 1:', await db.get('users', 1))

console.log('Deleted user 2:', await db.delete('users', 2))
console.log('Remaining users:', await db.getAll('users'))

await db.clear('users')
console.log('isEmpty after clear:', await db.isEmpty('users')) // true`,
  name: 'CRUD Operations',
};
