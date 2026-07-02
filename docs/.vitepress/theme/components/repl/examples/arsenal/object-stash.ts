export const objectStashExample = {
  code: `import { stash } from '@vielzeug/arsenal'

// Create a cache keyed by string
const cache = stash({ hash: (k) => k })

// Basic set / get / TTL
cache.set('greeting', 'hello', { ttlMs: 5000 })
console.log('get:', cache.get('greeting')) // 'hello'
console.log('size:', cache.size)           // 1

// getOrSet — stampede prevention
// Concurrent callers share one in-flight Promise
const fetchUser = (id) =>
  new Promise((resolve) =>
    setTimeout(() => resolve({ id, name: 'Alice' }), 50)
  )

const [a, b] = await Promise.all([
  cache.getOrSet('user:1', () => fetchUser(1)),
  cache.getOrSet('user:1', () => fetchUser(1)), // shares same promise
])
console.log('both equal?', a === b)  // true — same resolved object

// forceRefresh — bypass cache and call factory again
await cache.getOrSet('user:1', () => fetchUser(99))
const fresh = await cache.getOrSet('user:1', () => Promise.resolve({ id: 99, name: 'Bob' }), { forceRefresh: true })
console.log('refreshed:', fresh.name) // 'Bob'

// delete() before the in-flight resolves does NOT re-add the value
let resolve
const pending = cache.getOrSet('volatile', () => new Promise(r => { resolve = r }))
cache.delete('volatile')   // cancel before resolve
resolve('data')
const resolved = await pending
console.log('caller gets:', resolved)          // 'data' — promise still resolves
console.log('in store?', cache.get('volatile')) // undefined — not re-added`,
  name: 'stash - Key-value cache with TTL and stampede prevention',
};
