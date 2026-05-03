export const scopedExecutionExample = {
  code: `import { createContainer, createToken } from '@vielzeug/wireit'

const RequestId = createToken('RequestId')
const Handler = createToken('Handler')

const container = createContainer()
container.factory(Handler, (id) => ({ process: () => 'Handled ' + id }), { deps: [RequestId] })

const result = await container.runInScope(async (scope) => {
  scope.value(RequestId, 'req-123')
  const h = await scope.resolve(Handler)
  return h.process()
})

console.log(result)`,
  name: 'runInScope Isolation',
};
