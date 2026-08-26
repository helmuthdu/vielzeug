export const pruneScheduleExample = {
  code: `import { table, ttl } from '@vielzeug/vault'
import { createMemory } from '@vielzeug/vault/memory'

// pruneExpired() sweeps all tables and removes expired records.
// Schedule it with setInterval and cancel on disposalSignal.

const schema = { sessions: table('token') }
const db = createMemory({ schema })

const pruneInterval = setInterval(() => db.pruneExpired(), ttl.minutes(15))
db.disposalSignal.addEventListener('abort', () => clearInterval(pruneInterval))

// Write a session that expires in 1 ms
await db.put('sessions', { token: 'abc', user: 1 }, ttl.ms(1))
await db.put('sessions', { token: 'def', user: 2 }) // no TTL — permanent

console.log('before prune:', await db.count('sessions')) // 2 (lazy eviction: both exist physically)

// Manual prune to demonstrate the API
await new Promise((resolve) => setTimeout(resolve, 5))
const pruned = await db.pruneExpired()
console.log('pruned:', pruned.sessions) // 1 (the expired session)
console.log('after prune:', await db.count('sessions')) // 1

await db.dispose()`,
  name: 'TTL — pruneExpired with disposalSignal',
};
