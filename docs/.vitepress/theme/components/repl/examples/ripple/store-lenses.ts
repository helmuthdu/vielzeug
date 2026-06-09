export const storeLensesExample = {
  code: `import { store, effect, batch } from '@vielzeug/ripple'

// lens() creates a writable Signal scoped to a dot-path in the store.
// Fine-grained: only effects that read the lens re-run when that path changes.
const settings = store({
  theme: 'light' as 'light' | 'dark',
  user: { name: 'Alice', notifications: true },
})

const themeLens = settings.lens('theme')
const nameLens = settings.lens('user.name')
const notifLens = settings.lens('user.notifications')

// Each effect only subscribes to its own lens
const stopTheme = effect(() => console.log('theme:', themeLens.value))
const stopName  = effect(() => console.log('name:', nameLens.value))

// Only the theme effect re-runs
themeLens.value = 'dark'

// Only the name effect re-runs
nameLens.value = 'Bob'

// Neither effect runs — notifLens has no subscribers for the above effects
batch(() => {
  notifLens.value = false
  console.log('notifications:', notifLens.value)
})

console.log('final state:', settings.value)

stopTheme.dispose()
stopName.dispose()`,
  name: 'Store — fine-grained lens reactivity',
};
