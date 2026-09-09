export const disposeLifecycleExample = {
  code: `import { createContainer, factoryProvider, token } from '@vielzeug/conduit'

const Database = token('Database')
const Service = token('Service')
const order = []

const container = createContainer([
  factoryProvider(Database, [], () => ({ close() {} }), { dispose: () => { order.push('database') } }),
  factoryProvider(Service, [Database], database => ({ database }), { dispose: () => { order.push('service') } }),
])

await container.resolve({ service: Service })
await container.dispose()
console.log(order)`,
  name: 'Reverse dependency disposal',
};
