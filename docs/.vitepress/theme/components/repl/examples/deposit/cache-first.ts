export const cacheFirstExample = {
  code: `import { createLocalStorage, table, ttl } from '@vielzeug/deposit'

const schema = {
  cache: table('id'),
}

const db = createLocalStorage({ name: 'cache-demo', schema })

async function getOrCreateConfig() {
  const existing = await db.get('cache', 'config')

  if (existing) {
    return { source: 'cache', value: existing }
  }

  const fresh = { id: 'config', data: 'computed value', fetched: Date.now() }
  await db.put('cache', fresh, ttl.minutes(5))

  return { source: 'computed', value: fresh }
}

console.log(await getOrCreateConfig())
console.log(await getOrCreateConfig())
console.log('Stored record:', await db.get('cache', 'config'))`,
  name: 'Cache-First Pattern',
};
