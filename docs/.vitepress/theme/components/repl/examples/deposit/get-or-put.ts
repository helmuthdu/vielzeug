export const getOrPutExample = {
  code: `import { createLocalStorage, table, ttl } from '@vielzeug/deposit'

const schema = {
  cache: table('id'),
}

const db = createLocalStorage('cache-demo', schema)

console.log('First call inserts the record')
const first = await db.getOrPut(
  'cache',
  { id: 'config', data: 'computed value', fetched: Date.now() },
  ttl.minutes(5),
)
console.log(first)

console.log('Second call returns the existing record for that key')
const second = await db.getOrPut('cache', {
  id: 'config',
  data: 'ignored replacement',
  fetched: 0,
})
console.log(second)

console.log('Stored record:', await db.get('cache', 'config'))`,
  name: 'getOrPut - Cache Pattern',
};
