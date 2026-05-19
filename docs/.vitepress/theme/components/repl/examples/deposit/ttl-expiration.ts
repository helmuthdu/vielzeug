export const ttlExpirationExample = {
  code: `import { createLocalStorage, table, ttl } from '@vielzeug/deposit'

const schema = {
  cache: table('id'),
}

const db = createLocalStorage({ name: 'cache-demo', schema })

await db.put('cache', { id: 'temp', data: 'Temporary data' }, ttl.seconds(1))
await db.put('cache', { id: 'numeric', data: 'Numeric TTL' }, 250)
console.log('Stored records with helper + numeric TTL')
console.log('Immediate read:', await db.get('cache', 'temp'))

await new Promise((resolve) => setTimeout(resolve, 1500))
console.log('After 1.5s:', await db.get('cache', 'temp'))

console.log('ttl helpers:', {
  '250ms': ttl.ms(250),
  '5 minutes': ttl.minutes(5),
  '2 hours': ttl.hours(2),
  '7 days': ttl.days(7),
})`,
  name: 'TTL & Expiration',
};
