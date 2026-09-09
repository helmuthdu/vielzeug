export const validateExample = {
  code: `import { createContainer, factoryProvider, token } from '@vielzeug/conduit'

const Api = token('Api')
const Service = token('Service')

try {
  createContainer([
    factoryProvider(Service, [Api], api => ({ api })),
  ])
} catch (error) {
  console.log(error.message)
}`,
  name: 'Fail-fast startup validation',
};
