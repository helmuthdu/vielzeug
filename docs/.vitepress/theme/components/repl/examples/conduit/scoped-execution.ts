export const scopedExecutionExample = {
  code: `import { createContainer, scope, token } from '@vielzeug/conduit'

const RequestScope = scope('request')
const RequestId = token('RequestId')
const Handler = token('Handler')

const container = createContainer()
container.factory(RequestId, () => crypto.randomUUID(), { lifetime: RequestScope })
container.factory(Handler, async (r) => {
  const id = await r.resolve(RequestId)
  return { process: () => 'Handled ' + id }
}, { lifetime: RequestScope })

const scopeA = container.createScope(RequestScope)
const scopeB = container.createScope(RequestScope)

const a = await scopeA.resolve(Handler)
const b = await scopeB.resolve(Handler)

console.log(a.process())
console.log(b.process())
console.log('Different request ids:', a.process() !== b.process())`,
  name: 'Named Scope Isolation',
};
