export const asyncResourceExample = {
  code: `import { createScope, effect, resource, signal } from '@vielzeug/ripple'

// Resource reloads from tracked input and ignores stale loader work.
const scope = createScope()
const { userId, user } = scope.run(() => {
  const userId = signal('u1')
  const user = resource(
  () => userId.value,
  async (id, { signal }) => {
    await new Promise((resolve) => setTimeout(resolve, 30))
    if (signal.aborted) throw new Error('request aborted')
    return { id, name: 'User ' + id }
  },
)

  effect(() => console.log(user.value))
  return { userId, user }
})

userId.value = 'u2'
await new Promise((resolve) => setTimeout(resolve, 50))
user.reload()
await new Promise((resolve) => setTimeout(resolve, 50))
scope.dispose()`,
  name: 'Async Resource',
};
