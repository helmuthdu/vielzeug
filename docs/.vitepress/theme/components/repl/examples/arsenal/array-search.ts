export const arraySearchExample = {
  code: `import { fuzzy } from '@vielzeug/arsenal'

// fuzzy() — filter mode returns matching items; scored mode ranks by score
const users = [
  { name: 'Alice Johnson', role: 'admin' },
  { name: 'Bob Smith', role: 'user' },
  { name: 'Charlie Brown', role: 'user' },
  { name: 'David Miller', role: 'moderator' }
]

// Filter mode — returns T[] ordered by original position
const byName = fuzzy(users, 'alice', { fields: ['name'] })
console.log('Filter mode:', byName)

// Scored mode — returns ScoredResult[] sorted by score descending
const ranked = fuzzy(users, 'smith', { scored: true })
console.log('Scored mode:', ranked)

// Threshold controls minimum similarity (0-1); default 0.25
const strict = fuzzy(users, 'miller', { threshold: 0.5, fields: ['name'] })
console.log('Threshold 0.5:', strict)`,
  name: 'fuzzy - Fuzzy search in arrays',
};
