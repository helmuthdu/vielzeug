export const roleHierarchyExample = {
  code: `import { allow, createWard } from '@vielzeug/ward'

const ward = createWard([
  ...allow('editor',    'posts', ['read']),
  ...allow('moderator', 'posts', ['delete']),
])

const user  = { id: '42', roles: ['editor', 'moderator'] }
const bound = ward.forUser(user)

console.log('Can read posts:   ', bound.explain('posts', 'read').allowed)
console.log('Can delete posts: ', bound.explain('posts', 'delete').allowed)
console.log('Allowed actions:  ', bound.allowedActions('posts', ['read', 'delete', 'update']))`,
  name: 'Bound Multi-Role Access',
};
