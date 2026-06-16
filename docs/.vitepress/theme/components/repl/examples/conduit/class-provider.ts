export const classProviderExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

const DbToken = token('Database')
const SvcToken = token('Service')

class Database {
  users = [{ id: 1, name: 'Alice' }]
}

const container = createContainer()
container.factory(DbToken, () => new Database())
container.factory(SvcToken, async (r) => {
  const db = await r.resolve(DbToken)
  return { listUsers: () => db.users }
})

const service = await container.resolve(SvcToken)
console.log('Users:', service.listUsers())`,
  name: 'Factory Providers',
};
