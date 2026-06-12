export const fluentBuilderExample = {
  code: `import { createWard, owns, rule } from '@vielzeug/ward'

// Fluent builder with ownership predicate
const ward = createWard([
  ...rule().allow('viewer').on('posts').to('read').build(),
  ...rule().allow('editor').on('posts').to('read', 'update').build(),
  ...rule().allow('editor').on('posts').to('update').when(owns('authorId')).build(),
  ...rule().deny('blocked').on('posts').to('read', 'update').build(),
])

const editor = { id: 'u1', roles: ['editor'] }

// read: allowed (no predicate required)
console.log('read:  ', ward.can(editor, 'posts', 'read'))

// update with own post
const myPost = { authorId: 'u1' }
console.log('update own:  ', ward.can(editor, 'posts', 'update', myPost))

// update someone else's post
const otherPost = { authorId: 'u2' }
console.log('update other:', ward.can(editor, 'posts', 'update', otherPost))`,
  name: 'Fluent Builder',
};
