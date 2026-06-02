export const reactiveObserveExample = {
  code: `import { createMemory, table } from '@vielzeug/vault'

const schema = {
  users: table('id'),
  posts: table('id'),
}

const db = createMemory({ schema })

// observe() — future changes only by default (immediate: false)
const snapshots = []
const stop = db.observe('users', (rows) => {
  snapshots.push(rows.length)
  console.log('users changed:', rows.map((u) => u.name))
})

// observe with immediate: true — fires right away with the current table state
const stopImmediate = db.observe('users', (rows) => {
  console.log('immediate snapshot:', rows.length, 'users')
}, { immediate: true })

// observeMany — combined snapshot across tables; fires when any table changes
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
console.log('observer fired', snapshots.length, 'times, snapshots:', snapshots)

stop()
stopImmediate()
stopMany()
db.dispose()`,
  name: 'Reactive — observe & observeMany',
};
