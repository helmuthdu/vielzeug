export const debugRouterExample = {
  code: `import { createMemoryHistory } from '@vielzeug/wayfinder'
import { debugRouter } from '@vielzeug/wayfinder/devtools'

const router = debugRouter({
  history: createMemoryHistory('/'),
  routes: {
    home: { path: '/' },
    userDetail: { path: '/users/:id', data: async ({ params }) => ({ id: params.id }) },
    settings: { path: '/settings' },
  },
})

await router.ready
await router.navigate({ name: 'userDetail', params: { id: '42' } })
await router.navigate({ name: 'settings' })

console.log('active route:', router.getSnapshot().matches.at(-1)?.name)
router.dispose()`,
  name: 'Debug Router — Navigation Logging',
};
