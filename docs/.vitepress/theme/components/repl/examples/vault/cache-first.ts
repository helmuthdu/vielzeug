export const cacheFirstExample = {
  code: `import { s } from '@vielzeug/spell'
import { table, ttl } from '@vielzeug/vault'
import { createLocalStorage } from '@vielzeug/vault/local-storage'

const CacheSchema = s.object({ data: s.string(), fetchedAt: s.number(), id: s.string() })
const db = createLocalStorage({
  name: 'cache-demo',
  schema: { cache: table('id') },
  codecs: { cache: CacheSchema },
})

async function getOrComputeConfig() {
  const existing = await db.get('cache', 'config')
  if (existing) return existing

  const record = {
    id: 'config',
    data: 'computed value',
    fetchedAt: Date.now(),
  }
  await db.put('cache', record, ttl.minutes(5))
  return record
}

const first = await getOrComputeConfig()
const second = await getOrComputeConfig()
console.log('Same cached record:', first.fetchedAt === second.fetchedAt)`,
  name: 'Cache-First with get + put',
};
