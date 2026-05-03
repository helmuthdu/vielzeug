export const bulkOperationsExample = {
  code: "import { createLocalStorage, table } from '@vielzeug/deposit'\n\nconst db = createLocalStorage({\n  dbName: 'bulk-demo',\n  schema: {\n    items: table('id'),\n  },\n})\n\nconst items = Array.from({ length: 10 }, (_, i) => ({\n  id: i + 1,\n  value: +(Math.random() * 1000).toFixed(2),\n}))\n\nawait db.putAll('items', items)\nconsole.log('Inserted', items.length, 'items')\n\n// Delete individual items\nawait db.delete('items', 1)\nawait db.delete('items', 2)\nawait db.delete('items', 3)\nconsole.log('Deleted 3 items')\nconsole.log('Remaining:', await db.count('items'))",
  name: 'Bulk Operations',
};
