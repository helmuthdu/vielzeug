export const scopedExecutionExample = {
  code: `import { createContainer, scope, token } from '@vielzeug/conduit'

const Request = scope('request')
const Session = token('Session')
const root = createContainer()

root.factory(Session, [], () => ({ id: crypto.randomUUID() }), { lifetime: Request })

const request = root.createScope(Request)
console.log(await request.resolve(Session))
await request.dispose()
await root.dispose()`,
  name: 'Named scope ownership',
};
