export const basicSignalExample = {
  code: `import { computed, createScope, effect, signal } from '@vielzeug/ripple'

const scope = createScope()
const { count } = scope.run(() => {
  const count = signal(0)
  const doubled = computed(() => count.value * 2)

  effect(() => {
    console.log({ count: count.value, doubled: doubled.value })
  })

  return { count }
})

count.value = 1
count.value = 2

scope.dispose()
`,
  name: 'Create Graph, Signal, Computed & Effect',
};
