export const disposeLifecycleExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

const Database = token('Database')
const Service = token('Service')
const order = []
const container = createContainer()

container.factory(Database, [], () => ({ close() {} }), { dispose: () => { order.push('database') } })
container.factory(Service, [Database], database => ({ database }), { dispose: () => { order.push('service') } })

await container.resolve(Service)
await container.dispose()
console.log(order)`,
  name: 'Reverse dependency disposal',
};
