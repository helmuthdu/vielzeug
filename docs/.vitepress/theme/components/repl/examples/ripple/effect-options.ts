export const effectOptionsExample = {
  code: `import { createRipple } from '@vielzeug/ripple'

// Runtime errors use one callback; named effects flush synchronously.
const ripple = createRipple({
  onError: (error, context) => console.log(context.kind, context.name, error.message),
})
const count = ripple.signal(0)
const stop = ripple.effect(
  () => {
    if (count.value < 0) throw new Error('count must be non-negative')
    console.log('count:', count.value)
  },
  { name: 'count logger' },
)

ripple.batch(() => {
  count.value = 1
  count.value = 2
})
count.value = -1
count.value = 3

stop.dispose()
ripple.dispose()`,
  name: 'Named Effect and onError',
};
