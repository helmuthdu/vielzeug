export const resolveOptionalExample = {
  code: `import { createContainer, token, ContainerDisposedError } from '@vielzeug/conduit'

const Config = token('Config')
const Plugin = token('Plugin')

const container = createContainer()
container.value(Config, { apiUrl: 'https://api.example.com' })
// Plugin intentionally not registered

// resolveOptional — returns undefined when token is not registered
const maybePlugin = await container.resolveOptional(Plugin)
console.log('plugin:', maybePlugin) // undefined

// resolveOrDefault — returns the fallback value when not registered
const plugin = await container.resolveOrDefault(Plugin, { name: 'noop' })
console.log('plugin (default):', plugin.name) // noop

// tryResolve — discriminated union result, never throws
const result = await container.tryResolve(Plugin)
if (result.ok) {
  console.log('resolved:', result.value)
} else {
  console.log('not available — error type:', result.error?.constructor?.name)
}

// resolveOptional still throws ContainerDisposedError
await container.dispose()
try {
  await container.resolveOptional(Config)
} catch (err) {
  console.log('disposed error:', err instanceof ContainerDisposedError)
}`,
  name: 'resolveOptional / resolveOrDefault / tryResolve',
};
