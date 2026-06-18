export const syncHotPathExample = {
  code: `import { createContainer, token, resolveSyncOptional, resolveSyncOrDefault, SyncResolutionError } from '@vielzeug/conduit'

const Config = token('Config')
const Timeout = token('Timeout')
const OptionalPlugin = token('OptionalPlugin')

const container = createContainer()
container.value(Config, { apiUrl: 'https://api.example.com', debug: false })
container.factory(Timeout, () => 5000)
// OptionalPlugin intentionally not registered

// Pre-warm all singletons once at startup
await container.resolveAll()

// resolveSync — works now that singletons are cached
const config = container.resolveSync(Config)
console.log('config:', config.apiUrl)

// resolveSyncOptional — returns undefined when token is not registered
const plugin = resolveSyncOptional(container, OptionalPlugin)
console.log('plugin:', plugin) // undefined — no try/catch needed

// resolveSyncOrDefault — returns the fallback when token is not registered
const timeout = resolveSyncOrDefault(container, Timeout, 3000)
console.log('timeout:', timeout) // 5000 — Timeout IS registered

const missing = resolveSyncOrDefault(container, OptionalPlugin, { name: 'noop' })
console.log('missing (default):', missing.name) // noop

// resolveSyncOptional still throws SyncResolutionError for unresolved factories
const container2 = createContainer()
container2.factory(Config, () => ({ apiUrl: '...' }))
// did NOT call resolveAll() — factory not yet resolved
try {
  resolveSyncOptional(container2, Config)
} catch (err) {
  console.log('SyncResolutionError:', err instanceof SyncResolutionError) // true
}`,
  name: 'resolveSyncOptional / resolveSyncOrDefault hot path',
};
