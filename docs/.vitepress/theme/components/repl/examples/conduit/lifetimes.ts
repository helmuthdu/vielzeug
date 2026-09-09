export const lifetimesExample = {
  code: `import { createContainer, factoryProvider, token } from '@vielzeug/conduit'

const Singleton = token('Singleton')

const container = createContainer([
  factoryProvider(Singleton, [], () => ({ id: crypto.randomUUID() })),
])

const services = await container.resolve({ a: Singleton, b: Singleton })
console.log(services.a === services.b)
await container.dispose()`,
  name: 'Singleton lifetime caching',
};
