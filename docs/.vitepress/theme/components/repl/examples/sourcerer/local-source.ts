export const localSourceExample = {
  code: `import { createLocalSource } from '@vielzeug/sourcerer'

const users = [
  { id: 1, name: 'Ada', role: 'admin' },
  { id: 2, name: 'Grace', role: 'admin' },
  { id: 3, name: 'Linus', role: 'user' },
]

const source = createLocalSource(users, {
  initialQuery: { pageSize: 2 },
  match: (user, search) => user.name.toLowerCase().includes(search.toLowerCase()),
})

source.setQuery({ search: 'a' })
console.log(source.snapshot.data)
console.log(source.snapshot.pagination)

source.dispose()`,
  name: 'Local Source',
};
