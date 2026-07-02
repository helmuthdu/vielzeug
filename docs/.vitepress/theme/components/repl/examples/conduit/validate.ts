export const validateExample = {
  code: `import { createContainer, token, ConduitCircularDependencyError, ConduitProviderNotFoundError } from '@vielzeug/conduit'

const A = token('A')
const B = token('B')
const C = token('C')

// --- Valid graph: freeze() validates then seals ---
const valid = createContainer()
valid.value(C, 'leaf')
valid.factory(B, async (r) => 'B(' + (await r.resolve(C)) + ')')
valid.factory(A, async (r) => 'A(' + (await r.resolve(B)) + ')')
valid.freeze() // ✓ validates graph, then locks
console.log('Valid graph passed freeze()')

// --- Circular dependency detected by freeze() ---
const cyclic = createContainer()
cyclic.factory(A, async (r) => r.resolve(B))
cyclic.factory(B, async (r) => r.resolve(A))
try {
  cyclic.freeze()
} catch (err) {
  console.log('Caught circular dep:', err instanceof ConduitCircularDependencyError, err.message)
}

// --- Missing dependency detected by freeze() ---
const missing = createContainer()
const Unknown = token('UnknownService')
missing.factory(A, async (r) => r.resolve(Unknown))
try {
  missing.freeze()
} catch (err) {
  console.log('Caught missing dep:', err instanceof ConduitProviderNotFoundError, err.message)
}`,
  name: 'Cycle Detection (freeze())',
};
