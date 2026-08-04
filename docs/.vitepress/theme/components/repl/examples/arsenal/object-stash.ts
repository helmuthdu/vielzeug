export const objectStashExample = {
  code: `import { cache } from '@vielzeug/arsenal/cache'

let time = 0
const users = cache({ now: () => time, ttlMs: 5000 })

users.set('greeting', 'hello')
console.log('get:', users.get('greeting'))

const loadUser = (id) => new Promise(resolve => setTimeout(() => resolve({ id, name: 'Alice' }), 50))
const [first, second] = await Promise.all([
  users.getOrLoad('user:1', () => loadUser(1)),
  users.getOrLoad('user:1', () => loadUser(1)),
])
console.log('same value:', first === second)

time = 5000
console.log('expired:', users.get('greeting'))`,
  name: 'cache - Identity keys, TTL, and load deduplication',
};
