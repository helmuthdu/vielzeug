export const basicSetupExample = {
  code: "import { createLocalStorage, table } from '@vielzeug/deposit'\n\nconst db = createLocalStorage({\n  dbName: 'demo',\n  schema: {\n    users: table('id'),\n  },\n})\n\nawait db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com' })\nawait db.put('users', { id: 2, name: 'Bob', email: 'bob@example.com' })\n\nconsole.log('Get user 1:', await db.get('users', 1))\nconsole.log('All users:', await db.getAll('users'))\nconsole.log('Count:', await db.count('users'))",
  name: 'Basic Setup - Initialize Deposit',
};
