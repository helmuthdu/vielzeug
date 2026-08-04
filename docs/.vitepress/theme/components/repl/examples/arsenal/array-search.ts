export const arraySearchExample = {
  code: `import { fuzzyFilter, fuzzyScore } from '@vielzeug/arsenal/array'

const users = [
  { name: 'Alice Johnson', role: 'admin' },
  { name: 'Bob Smith', role: 'user' },
  { name: 'Charlie Brown', role: 'user' },
]

const byName = fuzzyFilter(users, 'alice', { select: user => user.name })
console.log('Filtered:', byName)

const ranked = fuzzyScore(users, 'smith', { select: user => [user.name, user.role] })
console.log('Ranked:', ranked)`,
  name: 'fuzzyFilter - Explicit searchable fields',
};
