export const classProviderExample = {
  code: `import { createContainer, createToken } from '/wired'

const DbToken = createToken('Database')
const SvcToken = createToken('Service')

class Database {
  users = [{ id: 1, name: 'Alice' }]
}

const container = createContainer()
container.factory(DbToken, () => new Database())
container.factory(SvcToken, (db) => ({ listUsers: () => db.users }), { deps: [DbToken] })

const service = await container.resolve(SvcToken)
console.log('Users:', service.listUsers())`,
  name: 'Factory Providers',
};
