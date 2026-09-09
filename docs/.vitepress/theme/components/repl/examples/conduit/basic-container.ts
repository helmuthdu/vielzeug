export const basicContainerExample = {
  code: `import { createContainer, factoryProvider, token, valueProvider } from '@vielzeug/conduit'

const Config = token<{ baseUrl: string }>('Config')
const Client = token<{ url: string }>('Client')

const container = createContainer([
  valueProvider(Config, { baseUrl: '/api' }),
  factoryProvider(Client, [Config], config => ({ url: config.baseUrl + '/users' })),
])

const services = await container.resolve({ client: Client })
console.log(services.client)
await container.dispose()`,
  name: 'Immutable provider array',
};
