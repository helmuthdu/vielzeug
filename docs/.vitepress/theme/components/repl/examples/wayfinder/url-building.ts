export const urlBuildingExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

// url(), resolve(), and isActive() are synchronous and do not modify router state.
const router = createRouter({
  base: '/app',
  history: createMemoryHistory('/app/users/123'),
  routes: {
    users:   { path: '/users' },
    user:    { path: '/users/:id' },
    comment: { path: '/posts/:postId/comments/:commentId' },
    search:  { path: '/search' },
  },
})

// Wait for the initial navigation to settle before reading active state.
await router.waitFor('user')

console.log('--- url() ---')
console.log('user:   ', router.url('user', { id: '42' }))
console.log('search: ', router.url('search', undefined, { q: 'typescript', page: 2 }))
console.log('comment:', router.url('comment', { postId: '10', commentId: '25' }))

console.log('--- resolve() ---')
const branch = router.resolve('/app/users/99')
console.log('matched:', branch?.map((n) => n.name + ' params=' + JSON.stringify(n.params)))
console.log('no match:', router.resolve('/app/does-not-exist'))

console.log('--- isActive() ---')
console.log('user (prefix):', router.isActive('user'))
console.log('users (prefix):', router.isActive('users'))  // true — /users prefix matches /users/123
console.log('users (exact):', router.isActive('users', { exact: true })) // false

router.dispose()`,
  name: 'URL Building — Resolve and Active State',
};
