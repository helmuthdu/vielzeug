export const deriveMergeExample = {
  code: `// deriveSource projects a source; mergeSource combines multiple sources into one
import { createLocalSource, deriveSource, mergeSource } from '@vielzeug/sourcerer'

const users = [
  { id: 1, name: 'Ada',   team: 'A', score: 92 },
  { id: 2, name: 'Grace', team: 'B', score: 88 },
  { id: 3, name: 'Linus', team: 'A', score: 75 },
]

const source = createLocalSource(users, { limit: 10 })

// deriveSource: reactive read-only projection with a different item shape
const names = deriveSource(source, items => items.map(u => u.name))
console.log('Derived names:', names.current)

// Changing the parent re-computes the derived source automatically
await source.patch({ sort: (a, b) => b.score - a.score })
console.log('Derived after sort by score desc:', names.current)

// mergeSource: combine two sources with a user-supplied combine function
const teamA = createLocalSource(users.filter(u => u.team === 'A'), { limit: 10 })
const teamB = createLocalSource(users.filter(u => u.team === 'B'), { limit: 10 })

const combined = mergeSource([teamA, teamB], all => all.flat())
console.log('Merged count:', combined.current.length)
console.log('Merged names:', combined.current.map(u => u.name))

names.dispose()
combined.dispose()
source.dispose()
teamA.dispose()
teamB.dispose()`,
  name: 'deriveSource & mergeSource',
};
