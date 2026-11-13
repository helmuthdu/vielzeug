export const reactiveSearchExample = {
  code: `import { createIndex, createSearch } from '@vielzeug/scout'

const users = [
  { name: 'Alice Johnson', email: 'alice@example.com' },
  { name: 'Bob Smith',     email: 'bob@example.com' },
  { name: 'Charlie Brown', email: 'charlie@example.com' },
  { name: 'Alicia Keys',   email: 'alicia@example.com' },
]

// The index holds the corpus; the search store keeps one snapshot in sync with it
const index = createIndex(users, { fields: ['name', 'email'] })
const search = createSearch(index, { debounce: 0 })

const show = (label) => {
  console.log(label, '\\u2192', search.getSnapshot().results.map(r => r.item.name).join(', ') || '(none)')
}

show('Empty query')    // all 4 users

search.setQuery('ali')
show('Query: "ali"')   // Alice Johnson, Alicia Keys, Dave Alison

search.setQuery('alice')
show('Query: "alice"') // Alice Johnson

// Add a new user at runtime: the search state re-runs the committed query
index.add({ name: 'Alice Cooper', email: 'cooper@example.com' })
show('After add()')    // now includes Alice Cooper

search.clear()
show('After clear()')  // all 5 users

search.dispose()
console.log('Disposed:', search.disposed)`,
  name: 'Reactive Search',
};
