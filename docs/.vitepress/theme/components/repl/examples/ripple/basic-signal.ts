export const basicSignalExample = {
  code: `import { createRipple } from '@vielzeug/ripple'

// One graph owns state, derived values, effects, and disposal.
const ripple = createRipple()
const count = ripple.signal(0)
const doubled = ripple.computed(() => count.value * 2)

const stop = ripple.effect(() => {
  console.log({ count: count.value, doubled: doubled.value })
})

count.value = 1
count.value = 2

stop.dispose()
ripple.dispose()`,
  name: 'Create Graph, Signal, Computed & Effect',
};
