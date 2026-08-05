export const validateExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

const Api = token('Api')
const Service = token('Service')
const container = createContainer()

container.factory(Service, [Api], api => ({ api }))

try {
  container.validate()
} catch (error) {
  console.log(error.message)
}

await container.dispose()`,
  name: 'Validate static dependencies',
};
