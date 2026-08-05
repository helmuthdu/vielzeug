export const lifetimesExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

const Singleton = token('Singleton')
const Transient = token('Transient')
const container = createContainer()

container.factory(Singleton, [], () => ({ id: crypto.randomUUID() }))
container.factory(Transient, [], () => ({ id: crypto.randomUUID() }), { lifetime: 'transient' })

console.log((await container.resolve(Singleton)) === (await container.resolve(Singleton)))
console.log((await container.resolve(Transient)) === (await container.resolve(Transient)))
await container.dispose()`,
  name: 'Singleton and transient lifetimes',
};
