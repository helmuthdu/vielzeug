export const localSourceExample = {
  code: `import { createLocalSource } from '@vielzeug/sourcerer'

const users = [
  { id: 1, name: 'Ada', role: 'admin' },
  { id: 2, name: 'Grace', role: 'admin' },
  { id: 3, name: 'Linus', role: 'user' },
]

const source = createLocalSource(users, {
  filter: (user, search) => user.name.toLowerCase().includes(search.toLowerCase()),
  pageSize: 2,
  params: '',
})

source.setParams('a')
console.log(source.state.items)
console.log(source.state.pagination)

source.dispose()`,
  name: 'Local Source',
};
