export const scopeExample = {
  code: `import { createRipple } from '@vielzeug/ripple'

// Nested work automatically belongs to parent effect run.
const ripple = createRipple()
const enabled = ripple.signal(true)
const count = ripple.signal(0)

const stop = ripple.effect(() => {
  if (!enabled.value) return

  ripple.effect(() => console.log('nested count:', count.value))
})

count.value = 1
enabled.value = false
count.value = 2

stop.dispose()
ripple.dispose()`,
  name: 'Nested Effect Ownership',
};
