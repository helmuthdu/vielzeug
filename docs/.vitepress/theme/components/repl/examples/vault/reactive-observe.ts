export const reactiveObserveExample = {
  code: `import { createMemory, table } from '@vielzeug/vault'

const schema = {
  users: table('id'),
  posts: table('id'),
}

const db = createMemory({ schema })

// observe() always fires immediately with the current table state on registration,
// then fires again on every subsequent mutation. Returns an Unsubscribe function.
const snapshots = []
const stop = db.observe('users', (rows) => {
  snapshots.push(rows.length)
  console.log('users snapshot:', rows.map((u) => u.name))
})

// observeMany — fires a combined snapshot once all tables deliver their initial
// state, then fires whenever any observed table changes
const stopMany = db.observeMany(['users', 'posts'], ({ users, posts }) => {
  console.log('dashboard:', users.length, 'users,', posts.length, 'posts')
})

// batch() defers all observer notifications until the callback resolves —
// the dashboard listener fires exactly once for both writes below
await db.batch(['users', 'posts'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Alice' })
  await tx.put('posts', { id: 10, title: 'Hello', userId: 1 })
})

await db.put('users', { id: 2, name: 'Bob' })
console.log('observer fired', snapshots.length, 'times (initial + 2 mutations)')

stop()
stopMany()
db.dispose()`,
  name: 'Reactive — observe & observeMany',
};
