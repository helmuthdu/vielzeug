export const validateExample = {
  code: `import { createContainer, token, CircularDependencyError, ProviderNotFoundError } from '@vielzeug/conduit'

const A = token('A')
const B = token('B')
const C = token('C')

// --- Valid graph ---
const valid = createContainer()
valid.value(C, 'leaf')
valid.factory(B, (c) => 'B(' + c + ')', { deps: [C] })
valid.factory(A, (b) => 'A(' + b + ')', { deps: [B] })
valid.validate() // ✓ no issues
console.log('Valid graph passed validate()')

// --- Circular dependency ---
const cyclic = createContainer()
cyclic.factory(A, (b) => b, { deps: [B] })
cyclic.factory(B, (a) => a, { deps: [A] })
try {
  cyclic.validate()
} catch (err) {
  console.log('Caught circular dep:', err instanceof CircularDependencyError, err.message)
}

// --- Missing dependency ---
const missing = createContainer()
const Unknown = token('UnknownService')
missing.factory(A, (u) => u, { deps: [Unknown] })
try {
  missing.validate()
} catch (err) {
  console.log('Caught missing dep:', err instanceof ProviderNotFoundError, err.message)
}`,
  name: 'validate()',
};
