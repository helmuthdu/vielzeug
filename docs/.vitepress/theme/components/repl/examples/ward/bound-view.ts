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

console.log('read:         ', user.explain({ action: 'read', resource: 'posts' }).allowed)
console.log('update:       ', user.explain({ action: 'update', resource: 'posts' }).allowed)

// delete requires ownership
const myPost    = { authorId: 'alice' }
const otherPost = { authorId: 'bob' }
console.log('delete own:   ', user.explain({ action: 'delete', data: myPost, resource: 'posts' }).allowed)
console.log('delete other: ', user.explain({ action: 'delete', data: otherPost, resource: 'posts' }).allowed)

// allowedActions — enumerate what alice can do
const actions = user.allowedActions({ data: myPost, knownActions: ['read', 'update', 'delete'], resource: 'posts' })
console.log('allowed:      ', actions)`,
  name: 'Bound View',
};
