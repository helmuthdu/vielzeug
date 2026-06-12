export const basicRoutingExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

// Named routes, typed params, and subscribe() for reactive rendering.
const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    home:       { path: '/' },
    about:      { path: '/about', data: async () => ({ title: 'About Us' }) },
    userDetail: { path: '/users/:id', data: async ({ params }) => ({ id: params.id, name: 'User ' + params.id }) },
  },
  notFound: {},
})

// React to every state change — the router notifies on navigate and load.
router.subscribe((state) => {
  const leaf = state.matches.at(-1)
  if (state.status === 'idle') {
    console.log('route:', leaf?.name, '| data:', JSON.stringify(leaf?.data))
  }
})

console.log('Initial pathname:', router.getSnapshot().location.pathname)

await router.navigate({ name: 'about' })
await router.navigate({ name: 'userDetail', params: { id: '42' } })

console.log('Current pathname:', router.getSnapshot().location.pathname)
console.log('Params:', router.getSnapshot().matches.at(-1)?.params)

router.dispose()`,
  name: 'Basic Routing — Route State and Navigation',
};
