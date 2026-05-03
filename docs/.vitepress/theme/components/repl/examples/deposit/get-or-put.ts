export const getOrPutExample = {
  code: "import { createLocalStorage, table } from '@vielzeug/deposit'\n\nconst db = createLocalStorage({\n  dbName: 'cache-demo',\n  schema: {\n    cache: table('id'),\n  },\n})\n\n// Cache pattern: get or compute & store\nlet result = await db.get('cache', 'config')\nif (!result) {\n  console.log('Cache miss — computing...')\n  await new Promise((r) => setTimeout(r, 200))\n  result = { id: 'config', data: 'computed value', fetched: Date.now() }\n  await db.put('cache', result)\n}\nconsole.log('First call:', result)\n\n// Second call uses cached value\nconst cached = await db.get('cache', 'config')\nif (cached) {\n  console.log('Cache hit! Value:', cached.data)\n}\nconsole.log('Second call (cache):', cached)",
  name: 'getOrPut - Cache Pattern',
};
