export const reactiveObserveExample = {
  code: `import { table } from '@vielzeug/vault'
import { createMemory } from '@vielzeug/vault/memory'

const db = createMemory({ schema: { users: table('id') } })
const snapshots = []
const stop = db.observe('users', (users) => snapshots.push(users.map((user) => user.name)))

await Promise.resolve()
await db.put('users', { id: 1, name: 'Ada' })
await Promise.resolve()

console.log(snapshots) // [[], ['Ada']]
stop()
await db.dispose()`,
  name: 'Reactive — observe()',
};
