export const effectOptionsExample = {
  code: `import { batch, createScope, effect, signal } from '@vielzeug/ripple'

// Scope errors use the nearest callback; named effects flush synchronously.
const scope = createScope({
  onError: (error, context) => console.log(context.kind, context.name, error.message),
})
const count = signal(0)
scope.run(() => effect(
  () => {
    if (count.value < 0) throw new Error('count must be non-negative')
    console.log('count:', count.value)
  },
  { name: 'count logger' },
))

batch(() => {
  count.value = 1
  count.value = 2
})
count.value = -1
count.value = 3

scope.dispose()`,
  name: 'Named Effect and onError',
};
