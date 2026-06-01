export const debugRouterExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

// Wire up a simple navigation logger using subscribe()
const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    home:       { path: '/' },
    userDetail: { path: '/users/:id', data: async ({ params }) => ({ id: params.id }) },
    settings:   { path: '/settings' },
  },
})

router.subscribe((snap) => {
  const name = snap.matches.at(-1)?.name ?? '?'
  console.log('[wayfinder:nav]', snap.status.padEnd(8), snap.location.pathname, name === '?' ? '' : '[' + name + ']')
})

await router.navigate({ name: 'userDetail', params: { id: '42' } })
await router.navigate({ name: 'settings' })

console.log('current route:', router.getSnapshot().matches.at(-1)?.name)

router.dispose()`,
  name: 'Debug Router — Navigation Logging',
};
