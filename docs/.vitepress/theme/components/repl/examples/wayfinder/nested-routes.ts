export const nestedRoutesExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

// Child route names use dot notation: 'dashboard.settings', 'dashboard.index'.
const router = createRouter({
  history: createMemoryHistory('/dashboard'),
  routes: {
    dashboard: {
      path: '/dashboard',
      data: async () => ({ section: 'Dashboard' }), // parent data runs for every child
      children: {
        index:    { index: true },                   // inherits parent path
        settings: { path: 'settings', data: async () => ({ view: 'settings' }) },
        audit:    { path: 'audit',    data: async () => ({ view: 'audit' }) },
      },
    },
    blogPost: {
      path: '/blog/posts/:id',
      data: async ({ params }) => ({ postId: params.id }),
    },
  },
})

// The initial match is dashboard.index (index: true).
const initial = await router.waitFor('dashboard.index')
console.log('initial branch:', initial.matches.map((m) => m.name))

await router.navigate({ name: 'dashboard.settings' })
const snap = router.getSnapshot()
console.log('settings branch:', snap.matches.map((m) => m.name))
console.log('leaf data:', JSON.stringify(snap.matches.at(-1)?.data))
console.log('audit url:', router.url('dashboard.audit'))

await router.navigate({ name: 'blogPost', params: { id: '123' } })
console.log('blog data:', JSON.stringify(router.getSnapshot().matches.at(-1)?.data))

router.dispose()`,
  name: 'Nested Routes — Children and Index Routes',
};
