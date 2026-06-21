export const reactiveSearchExample = {
  code: `import { createReactiveSearch } from '@vielzeug/scout'

const users = [
  { name: 'Alice Johnson', email: 'alice@example.com' },
  { name: 'Bob Smith',     email: 'bob@example.com' },
  { name: 'Charlie Brown', email: 'charlie@example.com' },
  { name: 'Alicia Keys',   email: 'alicia@example.com' },
]

// One call creates the index and the reactive search state together
const search = createReactiveSearch(users, { fields: ['name', 'email'], debounce: 0 })

const show = (label) => {
  console.log(label, '\\u2192', search.results.value.map(r => r.item.name).join(', ') || '(none)')
}

show('Empty query')    // all 4 users

search.query.value = 'ali'
show('Query: "ali"')   // Alice Johnson, Alicia Keys, Dave Alison

search.query.value = 'alice'
show('Query: "alice"') // Alice Johnson

// Add a new user at runtime via the exposed index
search.index.add({ name: 'Alice Cooper', email: 'cooper@example.com' })
show('After add()')    // now includes Alice Cooper

search.clear()
show('After clear()')  // all 5 users

search.dispose()
console.log('Disposed:', search.query.disposed)`,
  name: 'Reactive Search',
};
