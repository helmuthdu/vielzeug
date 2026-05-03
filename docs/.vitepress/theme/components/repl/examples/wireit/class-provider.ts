export const classProviderExample = {
  code: `import { createContainer, createToken } from '@vielzeug/wireit'

const DbToken = createToken('Database')
const SvcToken = createToken('Service')

class Database {
  users = [{ id: 1, name: 'Alice' }]
}

class Service {
  constructor(db) { this.db = db }
  listUsers() { return this.db.users }
}

const container = createContainer()
  .bind(DbToken, Database)
  .bind(SvcToken, Service, { deps: [DbToken] })

const service = await container.resolve(SvcToken)
console.log('Users:', service.listUsers())`,
  name: 'Class Providers',
};
