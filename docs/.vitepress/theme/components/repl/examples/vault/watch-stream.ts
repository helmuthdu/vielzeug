export const watchStreamExample = {
  code: `import { createMemory, table } from '@vielzeug/vault'

// watch() returns an AsyncIterable — each iteration yields a fresh snapshot.
// The observer cleans up automatically when the loop exits via break or return.
const schema = { tasks: table('id') }
const db = createMemory({ schema })

const ac = new AbortController()

// Start consuming snapshots in the background
;(async () => {
  for await (const tasks of db.watch('tasks', { signal: ac.signal })) {
    console.log('tasks snapshot:', tasks.map((t) => t.title))
    if (tasks.length >= 3) break // loop exit also cleans up the observer
  }
  console.log('watch loop exited')
})()

// Mutations trigger new snapshots in the async loop above
await db.put('tasks', { id: 1, title: 'Buy groceries' })
await db.put('tasks', { id: 2, title: 'Write tests' })
await db.put('tasks', { id: 3, title: 'Ship it' })

// AbortController can also stop the loop from outside
setTimeout(() => ac.abort(), 500)
db.dispose()`,
  name: 'Reactive — watch() AsyncIterable',
};
