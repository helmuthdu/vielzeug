export const disposeLifecycleExample = {
  code: `import { createContainer, createToken } from '/conduit'

const DbPool = createToken('DbPool')
const Cache = createToken('Cache')

const container = createContainer()

// Factory dispose hook — fires only if the instance was resolved
container.factory(
  DbPool,
  () => {
    console.log('DB pool created')
    return { query: (sql) => \`result of: \${sql}\`, end: () => console.log('DB pool closed') }
  },
  { dispose: (pool) => pool.end() }
)

// Value dispose hook — always fires at disposal
const cache = { store: new Map(), clear: () => console.log('Cache cleared') }
container.value(Cache, cache, { dispose: (c) => c.clear() })

// Resolve only DbPool — Cache value hook still fires at disposal
const db = await container.resolve(DbPool)
console.log(db.query('SELECT 1'))

console.log('--- disposing ---')
await container.dispose()
console.log('disposed:', container.disposed)`,
  name: 'Dispose Lifecycle',
};
