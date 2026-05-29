export const lifetimesExample = {
  code: `import { createContainer, createToken } from '/wired'

let singletonCount = 0
let transientCount = 0

const SingletonT = createToken('Singleton')
const TransientT = createToken('Transient')

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
