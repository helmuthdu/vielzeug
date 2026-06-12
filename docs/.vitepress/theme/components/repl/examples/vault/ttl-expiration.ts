export const ttlExpirationExample = {
  code: `import { createLocalStorage, table, ttl } from '@vielzeug/vault'

const schema = {
  cache: table('id'),
}

const db = createLocalStorage({ name: 'cache-demo', schema })

// ttl helpers produce a branded TtlMs value — raw numbers are rejected by the type system
await db.put('cache', { id: 'short', data: 'Expires in 1 second' }, ttl.seconds(1))
await db.put('cache', { id: 'long', data: 'Expires in 5 minutes' }, ttl.minutes(5))
console.log('Stored records with TTL')
console.log('Immediate read:', await db.get('cache', 'short'))

await new Promise((resolve) => setTimeout(resolve, 1500))
console.log('After 1.5s:', await db.get('cache', 'short')) // expired — undefined
console.log('Long-lived still here:', await db.get('cache', 'long'))

console.log('ttl helpers:', {
  '100ms': ttl.ms(100),
  '5 minutes': ttl.minutes(5),
  '2 hours': ttl.hours(2),
  '7 days': ttl.days(7),
})`,
  name: 'TTL & Expiration',
};
