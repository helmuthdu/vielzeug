export const cacheFirstExample = {
  code: `import { createLocalStorage, table, ttl } from '@vielzeug/vault'

const db = createLocalStorage({ name: 'cache-demo', schema: { cache: table('id') } })

async function getOrComputeConfig() {
  return db.getOrDefault('cache', 'config', () => ({
    id: 'config',
    data: 'computed value',
    fetchedAt: Date.now(),
  }), ttl.minutes(5))
}

const first = await getOrComputeConfig()
const second = await getOrComputeConfig()
console.log('Same cached record:', first.fetchedAt === second.fetchedAt)`,
  name: 'Cache-First with getOrDefault',
};
