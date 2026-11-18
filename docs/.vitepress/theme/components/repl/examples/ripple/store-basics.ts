export const storeBasicsExample = {
  code: `import { computed, createScope, effect, signal } from '@vielzeug/ripple'

// signal.update keeps immutable object updates explicit.
const scope = createScope()
const { user } = scope.run(() => {
  const user = signal({ name: 'Ada', visits: 0 })
  const greeting = computed(() => user.value.name + ': ' + user.value.visits)

  effect(() => console.log(greeting.value))
  return { user }
})

user.update((state) => ({ ...state, visits: state.visits + 1 }))
user.value = { name: 'Grace', visits: 5 }

scope.dispose()
`,
  name: 'Immutable State',
};
