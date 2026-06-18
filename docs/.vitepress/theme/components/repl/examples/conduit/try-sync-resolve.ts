export const trySyncResolveExample = {
  code: `import { createContainer, token, trySyncResolve, ProviderNotFoundError, SyncResolutionError } from '@vielzeug/conduit'

const Config = token('Config')
const Logger = token('Logger')
const Service = token('Service')
const Optional = token('Optional')

const container = createContainer()

container.value(Config, { env: 'production' })
container.value(Logger, { log: (msg) => console.log('[log]', msg) })

// FactoryResolver.resolveSync — access already-resolved deps synchronously inside a factory
container.factory(Service, (r) => {
  // Config is a value provider — always available synchronously
  const config = r.resolveSync(Config)
  const logger = r.resolveSync(Logger)
  return { start: () => logger.log(\`starting in \${config.env}\`) }
})

// Optional token intentionally NOT registered

// Pre-warm all singletons
await container.resolveAll()

// trySyncResolve — only returns { ok: false } for ProviderNotFoundError
const serviceResult = trySyncResolve(container, Service)
if (serviceResult.ok) {
  serviceResult.value.start() // starting in production
}

const optResult = trySyncResolve(container, Optional)
if (!optResult.ok) {
  console.log('optional not registered:', optResult.error instanceof ProviderNotFoundError) // true
}

// trySyncResolve re-throws SyncResolutionError (not ProviderNotFoundError)
const container2 = createContainer()
container2.factory(Config, async () => ({ env: 'test' }))
// NOT warmed — resolveSync would throw SyncResolutionError
try {
  trySyncResolve(container2, Config)
} catch (err) {
  console.log('re-thrown SyncResolutionError:', err instanceof SyncResolutionError) // true
}`,
  name: 'trySyncResolve + FactoryResolver.resolveSync',
};
