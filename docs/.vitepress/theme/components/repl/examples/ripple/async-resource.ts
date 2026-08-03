export const asyncResourceExample = {
  code: `import { createRipple } from '@vielzeug/ripple'

// Resource reloads from tracked input and ignores stale loader work.
const ripple = createRipple()
const userId = ripple.signal('u1')
const user = ripple.resource(
  () => userId.value,
  async (id, { signal }) => {
    await new Promise((resolve) => setTimeout(resolve, 30))
    if (signal.aborted) throw new Error('request aborted')
    return { id, name: 'User ' + id }
  },
)

ripple.effect(() => console.log(user.value))

userId.value = 'u2'
setTimeout(() => user.reload(), 50)
setTimeout(() => {
  user.dispose()
  ripple.dispose()
}, 100)`,
  name: 'Async Resource',
};
