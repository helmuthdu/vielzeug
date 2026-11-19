export const scopeExample = {
  code: `import { createScope, effect, signal } from '@vielzeug/ripple'

// Nested work automatically belongs to parent effect run.
const scope = createScope()
const { enabled, count } = scope.run(() => ({
  enabled: signal(true),
  count: signal(0),
}))

const stop = scope.run(() => effect(() => {
  if (!enabled.value) return

  effect(() => console.log('nested count:', count.value))
}))

count.value = 1
enabled.value = false
count.value = 2

stop.dispose()
scope.dispose()`,
  name: 'Nested Effect Ownership',
};
