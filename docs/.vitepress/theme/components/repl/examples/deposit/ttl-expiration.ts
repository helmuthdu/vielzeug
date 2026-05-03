export const ttlExpirationExample = {
  code: "import { createLocalStorage, table, ttl } from '@vielzeug/deposit'\n\nconst db = createLocalStorage({\n  dbName: 'cache-demo',\n  schema: {\n    cache: table('id'),\n  },\n})\n\n// Store with 1-second TTL\nawait db.put('cache', { id: 'temp', data: 'Temporary data' }, ttl.seconds(1))\nconsole.log('Stored with 1s TTL')\nconsole.log('Immediate read:', await db.get('cache', 'temp'))\n\nawait new Promise((r) => setTimeout(r, 1500))\nconsole.log('After 1.5s:', await db.get('cache', 'temp')) // undefined - expired\nconsole.log('ttl helpers:', {\n  '5 minutes': ttl.minutes(5),\n  '2 hours': ttl.hours(2),\n  '7 days': ttl.days(7),\n})",
  name: 'TTL & Expiration',
};
