export const testingExample = {
  code: `import { createContainer, factoryProvider, token, valueProvider } from '@vielzeug/conduit'

const Clock = token<{ now(): number }>('Clock')
const Service = token<{ timestamp: number }>('Service')

const container = createContainer([
  valueProvider(Clock, { now: () => 123 }),
  factoryProvider(Service, [Clock], clock => ({ timestamp: clock.now() })),
])

const services = await container.resolve({ service: Service })
console.log(services.service)
await container.dispose()`,
  name: 'Replace dependencies in tests',
};
