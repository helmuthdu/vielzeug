export const crudOperationsExample = {
  code: "import { createLocalStorage, table } from '@vielzeug/deposit'\n\nconst db = createLocalStorage({\n  dbName: 'demo',\n  schema: {\n    users: table('id'),\n  },\n})\n\nawait db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 })\nawait db.put('users', { id: 2, name: 'Bob', email: 'bob@example.com', age: 30 })\nconsole.log('Created 2 users')\n\nconsole.log('Get user 1:', await db.get('users', 1))\nconsole.log('All users:', await db.getAll('users'))\n\nawait db.put('users', { id: 1, name: 'Alice Smith', email: 'alice@example.com', age: 26 })\nconsole.log('Updated user 1:', await db.get('users', 1))\n\nawait db.delete('users', 2)\nconsole.log('Count after delete:', await db.count('users'))",
  name: 'CRUD Operations',
};
