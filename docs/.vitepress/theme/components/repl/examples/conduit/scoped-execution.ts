export const scopedExecutionExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

const RequestId = token('RequestId')
const Handler = token('Handler')

const container = createContainer()
container.factory(RequestId, () => crypto.randomUUID(), { lifetime: 'scoped' })
container.factory(Handler, (id) => ({ process: () => 'Handled ' + id }), {
  deps: [RequestId],
  lifetime: 'scoped',
})

const scopeA = container.createChild()
const scopeB = container.createChild()

const a = await scopeA.resolve(Handler)
const b = await scopeB.resolve(Handler)

console.log(a.process())
console.log(b.process())
console.log('Different request ids:', a.process() !== b.process())`,
  name: 'Scoped Child Isolation',
};
