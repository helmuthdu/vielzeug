export const lifetimesExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

let singletonCount = 0
let transientCount = 0

const SingletonT = token('Singleton')
const TransientT = token('Transient')

const container = createContainer()
container.factory(SingletonT, () => ({ id: ++singletonCount }))
container.factory(TransientT, () => ({ id: ++transientCount }), { lifetime: 'transient' })

const s1 = await container.resolve(SingletonT)
const s2 = await container.resolve(SingletonT)
const t1 = await container.resolve(TransientT)
const t2 = await container.resolve(TransientT)

console.log('Singleton same:', s1 === s2)
console.log('Transient different:', t1 !== t2)`,
  name: 'Provider Lifetimes',
};
