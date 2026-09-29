export const childContainersExample = {
  code: `import { createContainer, factoryProvider, token } from '@vielzeug/conduit'

const Session = token('Session')

const root = createContainer([])

const request = root.createScope({
  providers: [factoryProvider(Session, [], () => ({ id: crypto.randomUUID() }))],
})

const services = await request.resolve({ session: Session })
console.log(services.session)
await request.dispose()
await root.dispose()`,
  name: 'Child container ownership',
};
