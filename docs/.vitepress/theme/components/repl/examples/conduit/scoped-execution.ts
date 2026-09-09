export const scopedExecutionExample = {
  code: `import { createContainer, factoryProvider, scope, token } from '@vielzeug/conduit'

const Request = scope('request')
const Session = token('Session')

const root = createContainer([
  factoryProvider(Session, [], () => ({ id: crypto.randomUUID() }), { lifetime: Request }),
])

const request = root.createScope(Request)
const services = await request.resolve({ session: Session })
console.log(services.session)
await request.dispose()
await root.dispose()`,
  name: 'Named scope ownership',
};
