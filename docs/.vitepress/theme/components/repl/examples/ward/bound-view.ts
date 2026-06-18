export const boundViewExample = {
  code: `import { allow, createWard, deny, predicate } from '@vielzeug/ward'

// Principal-bound view: capture user once, check many times
const ward = createWard([
  ...allow('editor', 'posts', ['read', 'update']),
  // delete: allow only when user owns the post (higher priority wins)
  ...allow('editor', 'posts', ['delete'], { when: predicate.owns('authorId'), priority: 1 }),
  ...deny('editor',  'posts', ['delete'], { priority: 0 }),
])

const user = ward.forUser({ id: 'alice', roles: ['editor'] })

console.log('read:         ', user.explain('posts', 'read').allowed)
console.log('update:       ', user.explain('posts', 'update').allowed)

// delete requires ownership
const myPost    = { authorId: 'alice' }
const otherPost = { authorId: 'bob' }
console.log('delete own:   ', user.explain('posts', 'delete', myPost).allowed)
console.log('delete other: ', user.explain('posts', 'delete', otherPost).allowed)

// allowedActions — enumerate what alice can do
const actions = user.allowedActions('posts', ['read', 'update', 'delete'], myPost)
console.log('allowed:      ', actions)`,
  name: 'Bound View',
};
