export const indexedDbExample = {
  code: `import { table, ttl } from '@vielzeug/vault'
import { createIndexedDB } from '@vielzeug/vault/indexeddb'

const schema = {
  logs: table('id'),
}

// createIndexedDB returns TransactionalVaultStore with transactions and cursor iteration
const db = createIndexedDB({
  name: 'app-logs',
  schema,
  version: 1,
})

await db.putAll('logs', [
  { id: 1, level: 'info',  message: 'App started',          ts: Date.now() - 3000 },
  { id: 2, level: 'warn',  message: 'Slow query detected',  ts: Date.now() - 2000 },
  { id: 3, level: 'error', message: 'Request failed',       ts: Date.now() - 1000 },
  { id: 4, level: 'info',  message: 'Request succeeded',    ts: Date.now() },
], ttl.hours(1))

// batch() is atomic on IndexedDB — all writes commit or none do
await db.batch(['logs'], async (tx) => {
  await tx.put('logs', { id: 5, level: 'info', message: 'Batch committed', ts: Date.now() })
  await tx.deleteMany('logs', [1, 2]) // remove old entries in the same transaction
})

// iterate() — cursor-based streaming, only on TransactionalVaultStore
// the full table is never loaded into memory at once
const messages = []
for await (const entry of db.iterate('logs')) {
  messages.push(entry.message)
}
console.log('Streamed via iterate():', messages)

const errors = await db.query('logs').equals('level', 'error').toArray()
console.log('Errors:', errors.map((e) => e.message))
console.log('Total logs:', await db.query('logs').count())

// pruneExpired() reclaims storage from TTL-expired records that haven't been read
const pruned = await db.pruneExpired()
console.log('Pruned:', pruned)

await db.dispose()`,
  name: 'IndexedDB — Atomic Batch & iterate()',
};
