export const debugRouterExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

// Helper that mirrors debugRouter() from @vielzeug/wayfinder/devtools.
// In a real app, import debugRouter directly from the devtools sub-path.
function makeDebugRouter(options, label = 'nav') {
  const router = createRouter(options)
  const prefix = '[wayfinder:' + label + ']'

  router.subscribe((snap) => {
    const names = snap.matches.map((m) => m.name).filter(Boolean).join(', ')
    const suffix = names ? '  [' + names + ']' : ''
    if (snap.status === 'error') {
      console.log(prefix, 'error   ', snap.location.pathname + suffix, snap.error)
    } else {
      console.log(prefix, snap.status.padEnd(8), snap.location.pathname + suffix)
    }
  })

  return router
}

// Main router — uses default label 'nav'
const router = makeDebugRouter({
  history: createMemoryHistory('/'),
  routes: {
    home:       { path: '/' },
    userDetail: { path: '/users/:id', data: async ({ params }) => ({ id: params.id }) },
    settings:   { path: '/settings' },
  },
})

// Modal router — custom label disambiguates logs
const modal = makeDebugRouter({
  history: createMemoryHistory('/'),
  routes: { confirm: { path: '/confirm' }, idle: { path: '/' } },
}, 'modal')

await router.navigate({ name: 'userDetail', params: { id: '42' } })
await router.navigate({ name: 'settings' })
await modal.navigate({ name: 'confirm' })

console.log('main route:', router.getSnapshot().matches.at(-1)?.name)
console.log('modal route:', modal.getSnapshot().matches.at(-1)?.name)

router.dispose()
modal.dispose()`,
  name: 'Debug Router — Navigation Logging',
};
