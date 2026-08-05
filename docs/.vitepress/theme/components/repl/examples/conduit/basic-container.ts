export const basicContainerExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

const Config = token<{ baseUrl: string }>('Config')
const Client = token<{ url: string }>('Client')

const container = createContainer()
container.value(Config, { baseUrl: '/api' })
container.factory(Client, [Config], config => ({ url: config.baseUrl + '/users' }))

console.log(await container.resolve(Client))
await container.dispose()`,
  name: 'Dependency-first factory',
};
