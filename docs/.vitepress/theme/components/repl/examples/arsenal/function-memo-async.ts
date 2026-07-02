export const functionStashAsyncExample = {
  code: `import { stash } from '@vielzeug/arsenal'

// stash.getOrSet — concurrent callers share one in-flight Promise (stampede prevention)
const cache = stash({ ttlMs: 5000 })

let fetchCount = 0
function fetchUser(id) {
  // factory is called only once; concurrent callers receive the same Promise
  return cache.getOrSet(\`user:\${id}\`, async () => {
    fetchCount++
    await new Promise(r => setTimeout(r, 10))
    return { id, name: 'User ' + id }
  })
}

const [a, b, c] = await Promise.all([fetchUser(1), fetchUser(1), fetchUser(1)])
console.log('fetch count:', fetchCount)          // 1 — deduplicated
console.log('same reference:', a === b)          // true
console.log('value:', a)                         // { id: 1, name: 'User 1' }

// undefined is a valid cached value — factory is not called again
cache.set('empty', undefined)
const hit = cache.get('empty')
console.log('undefined cached:', hit === undefined && cache.size > 0)  // true

// forceRefresh bypasses cache and in-flight dedup
const fresh = await cache.getOrSet('user:1', async () => ({ id: 1, fresh: true }), { forceRefresh: true })
console.log('force-refreshed:', fresh)  // { id: 1, fresh: true }`,
  name: 'stash - Async caching with stampede prevention',
};
