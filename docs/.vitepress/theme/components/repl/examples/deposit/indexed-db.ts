export const indexedDbExample = {
  code: `import { createIndexedDB, table } from '@vielzeug/deposit'

const schema = {
  logs: table('id'),
}

const db = createIndexedDB({
  name: 'app-logs',
  schema,
  version: 1,
})

await db.putAll('logs', [
  { id: 1, level: 'info', message: 'App started', ts: Date.now() - 3000 },
  { id: 2, level: 'warn', message: 'Slow query detected', ts: Date.now() - 2000 },
  { id: 3, level: 'error', message: 'Request failed', ts: Date.now() - 1000 },
  { id: 4, level: 'info', message: 'Request succeeded', ts: Date.now() },
])

// batch() is atomic on IndexedDB — either all writes commit or none do
await db.batch(['logs'], async (tx) => {
  await tx.put('logs', { id: 5, level: 'info', message: 'Batch committed', ts: Date.now() })
  await tx.deleteMany('logs', [1, 2]) // bulk-delete old entries inside the same transaction
})

const errors = await db.query('logs').equals('level', 'error').toArray()
console.log('Errors:', errors.map((entry) => entry.message))
console.log('Total logs:', await db.query('logs').count())

const info = await db.debug()
for (const t of info.tables) {
  console.log(t.name + ':', t.recordCount, 'live,', t.expiredCount, 'expired')
}

db.dispose()`,
  name: 'IndexedDB Adapter',
};
