export const boundViewExample = {
  code: `import { createWard, owns, rule } from '@vielzeug/ward'

// Principal-bound view: capture user once, check many times
const ward = createWard([
  ...rule().allow('editor').on('posts').to('read', 'update', 'delete').build(),
  ...rule().allow('editor').on('posts').to('delete').when(owns('authorId')).priority(1).build(),
  ...rule().deny('editor').on('posts').to('delete').priority(0).build(),
])

const user = ward.forUser({ id: 'alice', roles: ['editor'] })

console.log('read:         ', user.can('posts', 'read'))
console.log('update:       ', user.can('posts', 'update'))

// delete requires ownership
const myPost    = { authorId: 'alice' }
const otherPost = { authorId: 'bob' }
console.log('delete own:   ', user.can('posts', 'delete', myPost))
console.log('delete other: ', user.can('posts', 'delete', otherPost))

// allowedActions — enumerate what alice can do
const actions = user.allowedActions('posts', ['read', 'update', 'delete'], myPost)
console.log('allowed:      ', actions)`,
  name: 'Bound View',
};
