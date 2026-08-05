export const reactiveObserveExample = {
  code: `import { createMemory, table } from '@vielzeug/vault'

const db = createMemory({ schema: { users: table('id') } })
const snapshots = []
const stop = db.observe('users', (users) => snapshots.push(users.map((user) => user.name)))

await Promise.resolve()
await db.put('users', { id: 1, name: 'Ada' })
await Promise.resolve()

console.log(snapshots) // [[], ['Ada']]
stop()
db.dispose()`,
  name: 'Reactive — observe()',
};
