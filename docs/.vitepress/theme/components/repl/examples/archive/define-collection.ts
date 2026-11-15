export const defineCollectionExample = {
  code: `import { s } from '@vielzeug/spell'
import { defineArchiveCollection } from '@vielzeug/archive'

// A collection declares its payload schema plus how to index it; the core
// derives canonical bytes, the content hash, and every wire schema.
const recipes = defineArchiveCollection({
  contentVersion: 1,
  filters: ['breakfast', 'dinner'],
  index: (p) => ({ filter: p.meal, tags: [...p.tags], title: p.name }),
  name: 'recipes',
  payloadSchema: s.object({
    meal: s.enum(['breakfast', 'dinner']),
    name: s.string().min(1).max(80),
    tags: s.array(s.string().min(1).max(24)),
  }),
  tags: ['quick', 'festive'],
})

console.log('collection:', recipes.name, '| filters:', recipes.filters.join(','))

// derive() validates, canonicalizes, and hashes in one async step.
const ok = await recipes.derive({ meal: 'dinner', name: 'Risotto', tags: ['festive'] })
console.log('derived title:', ok.title, '| revision bytes pinned:', ok.canonicalJson)
console.log('contentHash:', ok.contentHash.slice(0, 16) + '...')

// Identical content hashes identically, whatever key order it arrives in.
const again = await recipes.derive({ tags: ['festive'], name: 'Risotto', meal: 'dinner' })
console.log('stable hash:', again.contentHash === ok.contentHash)

// Invalid content returns null (the Worker answers 422), never throws.
console.log('bad payload:', await recipes.derive({ meal: 'lunch', name: '', tags: [] }))`,
  name: 'Define A Collection',
};
