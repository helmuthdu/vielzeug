export const basicContainerExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

const ConfigToken = token('Config')
const LoggerToken = token('Logger')

const container = createContainer()
container.value(ConfigToken, { apiUrl: 'https://api.example.com', timeout: 5000 })
container.factory(LoggerToken, async (r) => {
  const config = await r.resolve(ConfigToken)
  return { log: (msg) => console.log('[LOG]', config.apiUrl, msg) }
})

const config = await container.resolve(ConfigToken)
const logger = await container.resolve(LoggerToken)
logger.log('Container initialized')
console.log('Timeout:', config.timeout)`,
  name: 'Basic Container',
};
