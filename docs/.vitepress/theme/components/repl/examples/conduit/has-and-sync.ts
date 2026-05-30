export const hasAndSyncExample = {
  code: `import { createContainer, createToken } from '/conduit'

const Config = createToken('Config')
const Telemetry = createToken('Telemetry')

const container = createContainer()
container.factory(Config, async () => ({ apiUrl: 'https://api.example.com', retries: 3 }))
// Telemetry intentionally not registered

// has() checks registration without triggering the factory
console.log('Config registered:', container.has(Config))
console.log('Telemetry registered:', container.has(Telemetry))

// Warm up Config asynchronously during startup
await container.resolve(Config)

// After warm-up, resolveSync() returns cached instance immediately
const config = container.resolveSync(Config)
console.log('API URL:', config.apiUrl)
console.log('Retries:', config.retries)

// Guard optional integrations with has() + resolveSync()
if (container.has(Telemetry)) {
  const t = container.resolveSync(Telemetry)
  t.track('startup')
} else {
  console.log('Telemetry not available — skipping')
}`,
  name: 'has() and resolveSync()',
};
