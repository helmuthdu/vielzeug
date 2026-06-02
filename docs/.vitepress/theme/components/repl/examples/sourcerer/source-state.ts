export const sourceStateExample = {
  code: `// sourceState() derives a discriminated union for clean branching in UI render logic
import { createRemoteSource, sourceState, SourceTimeoutError } from '@vielzeug/sourcerer'

const source = createRemoteSource({
  fetch: async ({ page, limit }) => {
    const items = Array.from({ length: limit }, (_, i) => \`item-\${(page - 1) * limit + i + 1}\`)
    return { items, total: 30 }
  },
  limit: 5,
})

await source.ready()

const state = sourceState(source)

switch (state.status) {
  case 'loading':
    console.log('Loading...')
    break
  case 'error':
    console.log('Error:', state.error.message)
    break
  case 'success':
    console.log('Items:', state.items.join(', '))
    break
}

// SourceTimeoutError is thrown by ready(timeoutMs) when loading takes too long
const errorSource = createRemoteSource({
  autoFetch: false,
  fetch: () => new Promise(() => {}), // never resolves
  limit: 5,
})

try {
  void errorSource.reset()
  await errorSource.ready(50) // 50ms timeout
} catch (err) {
  if (err instanceof SourceTimeoutError) {
    console.log('Caught SourceTimeoutError:', err.message)
  }
}

source.dispose()
errorSource.dispose()`,
  name: 'sourceState & SourceTimeoutError',
};
