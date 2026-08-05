export const testingExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

const Clock = token<{ now(): number }>('Clock')
const Service = token<{ timestamp: number }>('Service')
const container = createContainer()

container.value(Clock, { now: () => 123 })
container.factory(Service, [Clock], clock => ({ timestamp: clock.now() }))

console.log(await container.resolve(Service))
await container.dispose()`,
  name: 'Replace dependencies in tests',
};
