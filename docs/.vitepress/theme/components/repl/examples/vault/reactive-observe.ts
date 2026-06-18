export const reactiveObserveExample = {
  code: `import { createMemory, table } from '@vielzeug/vault'

const schema = {
  users: table('id'),
  posts: table('id'),
}

const db = createMemory({ schema })
await db.put('users', { id: 1, name: 'Alice' })

// observe() fires immediately on registration (default immediate: true).
// Pass { immediate: false } to skip the initial snapshot — useful when
// you already hold the current state and only need change notifications.
const changes = []
const stopChangesOnly = db.observe(
  'users',
  (rows) => changes.push(rows.length),
  { immediate: false },
)

await db.put('users', { id: 2, name: 'Bob' })
console.log('change-only fires:', changes.length, '(expected 1, no initial)')

// observeMany — default: waits for all tables before firing.
// { eager: true } fires as soon as any table delivers its first snapshot;
// tables not yet resolved appear as empty arrays.
const eagerSnaps = []
const stopEager = db.observeMany(
  ['users', 'posts'],
  ({ users, posts }) => eagerSnaps.push({ users: users.length, posts: posts.length }),
  { eager: true },
)

// wait a microtask so initial snapshots propagate
await Promise.resolve()
await Promise.resolve()
console.log('eager snapshot:', eagerSnaps[0])
// => { users: 2, posts: 0 } — posts empty array because nothing written yet

await db.put('posts', { id: 10, title: 'Hello', userId: 1 })
await Promise.resolve()
await Promise.resolve()
console.log('after posts write:', eagerSnaps.at(-1))

stopChangesOnly()
stopEager()
db.dispose()`,
  name: 'Reactive — observe & observeMany',
};
