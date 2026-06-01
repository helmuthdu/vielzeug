export const basicContainerExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

const ConfigToken = token('Config')
const LoggerToken = token('Logger')

const container = createContainer()
container.value(ConfigToken, { apiUrl: 'https://api.example.com', timeout: 5000 })
container.factory(LoggerToken, (config) => ({ log: (msg) => console.log('[LOG]', config.apiUrl, msg) }), {
  deps: [ConfigToken],
})

const config = await container.resolve(ConfigToken)
const logger = await container.resolve(LoggerToken)
logger.log('Container initialized')
console.log('Timeout:', config.timeout)`,
  name: 'Basic Container',
};
