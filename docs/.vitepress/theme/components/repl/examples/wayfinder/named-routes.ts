export const namedRoutesExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

// Route keys become type-safe names; url() and navigate() reference them by name.
const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    home:        { path: '/' },
    users:       { path: '/users' },
    userDetail:  { path: '/users/:id' },
    postComment: { path: '/posts/:postId/comments/:commentId' },
  },
})

// Build base-aware URLs without navigating.
console.log('userDetail url:', router.url('userDetail', { id: '123' }))
console.log('postComment url:', router.url('postComment', { postId: '10', commentId: '50' }))
console.log('url with query:', router.url('users', undefined, { page: 2 }))

// Navigate by name — TypeScript will enforce the required params shape.
await router.navigate({ name: 'userDetail', params: { id: '42' } })

// isActive() defaults to prefix matching — useful for parent nav items.
console.log('userDetail isActive (prefix):', router.isActive('userDetail'))
console.log('users isActive (prefix):',      router.isActive('users'))
console.log('users isActive (exact):',       router.isActive('users', { exact: true }))

// resolve() returns the matched branch without navigating or running data().
const branch = router.resolve('/users/99')
console.log('resolved name:', branch?.at(-1)?.name)
console.log('resolved params:', branch?.at(-1)?.params)

router.dispose()`,
  name: 'Named Routes — Type-Safe Navigation',
};
