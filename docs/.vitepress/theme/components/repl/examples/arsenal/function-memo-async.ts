export const functionStashAsyncExample = {
  code: `import { cache } from '@vielzeug/arsenal/cache'

const users = cache({ ttlMs: 5000 })
let fetchCount = 0

function fetchUser(id) {
  return users.getOrLoad('user:' + id, async () => {
    fetchCount++
    await new Promise(resolve => setTimeout(resolve, 10))
    return { id, name: 'User ' + id }
  })
}

const [first, second] = await Promise.all([fetchUser(1), fetchUser(1)])
console.log('fetch count:', fetchCount)
console.log('same reference:', first === second)

users.delete('user:1')
console.log('fresh:', await fetchUser(1))`,
  name: 'cache - Async load deduplication',
};
