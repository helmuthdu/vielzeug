export const pruneScheduleExample = {
  code: `import { scheduleExpiredPrune, table, ttl } from '@vielzeug/vault'
import { createMemory } from '@vielzeug/vault/memory'

// scheduleExpiredPrune runs pruneExpired() on an interval and stops
// automatically when the adapter is disposed (VaultDisposedError).
// Use onError to surface unexpected failures instead of silently swallowing them.

const schema = { sessions: table('token') }
const db = createMemory({ schema })

const stop = scheduleExpiredPrune(db, {
  interval: ttl.minutes(15),
  onError: (err) => console.error('[vault] prune failed:', err),
})

// Write a session that expires in 1 ms
await db.put('sessions', { token: 'abc', user: 1 }, ttl.ms(1))
await db.put('sessions', { token: 'def', user: 2 }) // no TTL — permanent

console.log('before prune:', await db.count('sessions')) // 2 (lazy eviction: both exist physically)

// Manual prune to demonstrate the API
await new Promise((resolve) => setTimeout(resolve, 5))
const pruned = await db.pruneExpired()
console.log('pruned:', pruned.sessions) // 1 (the expired session)
console.log('after prune:', await db.count('sessions')) // 1

// When the adapter is disposed, the schedule stops automatically
await db.dispose()
stop() // or call stop() explicitly before dispose`,
  name: 'TTL — scheduleExpiredPrune with onError',
};
