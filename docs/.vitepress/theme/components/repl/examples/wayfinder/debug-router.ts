export const debugRouterExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    home: { path: '/' },
    userDetail: { path: '/users/:id', data: async ({ params }) => ({ id: params.id }) },
    settings: { path: '/settings' },
  },
})

// Observe navigation state changes via subscribe()
router.subscribe((state) => {
  const names = state.matches.map((m) => m.name).filter(Boolean).join(', ')
  console.debug(\`[wayfinder] \${state.status} \${state.location.pathname} [\${names}]\`)
})

await router.ready
await router.navigate({ name: 'userDetail', params: { id: '42' } })
await router.navigate({ name: 'settings' })

console.log('active route:', router.getSnapshot().matches.at(-1)?.name)
router.dispose()`,
  name: 'Navigation Logging',
};
