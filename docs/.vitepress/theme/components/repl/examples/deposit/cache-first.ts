export const cacheFirstExample = {
  code: `import { createLocalStorage, table, ttl } from '@vielzeug/deposit'

const schema = {
  cache: table('id'),
}

const db = createLocalStorage({ name: 'cache-demo', schema })

// getOrDefault is available inside batch() callbacks.
// On IndexedDB the check and insert are atomic; here on LocalStorage it is a
// logical read-then-write within the deferred-notification batch.
async function getOrComputeConfig() {
  return db.batch(['cache'], (tx) =>
    tx.getOrDefault('cache', 'config', () => ({
      id: 'config',
      data: 'computed value',
      fetchedAt: Date.now(),
    }), ttl.minutes(5)),
  )
}

const first = await getOrComputeConfig()  // inserts
const second = await getOrComputeConfig() // returns cached

console.log('First call (source: computed):', first.data)
console.log('Second call (same record):', second.fetchedAt === first.fetchedAt)
console.log('Stored:', await db.get('cache', 'config'))`,
  name: 'Cache-First with getOrDefault',
};
