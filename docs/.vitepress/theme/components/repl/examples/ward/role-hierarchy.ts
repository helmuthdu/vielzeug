export const roleHierarchyExample = {
  code: `import { allow, createWard } from '@vielzeug/ward'

const ward = createWard([
  allow('editor',    'posts', ['read']),
  allow('moderator', 'posts', ['delete']),
])

const user  = { id: '42', roles: ['editor', 'moderator'] }
const bound = ward.forUser(user)

console.log('Can read posts:   ', bound.explain({ action: 'read', resource: 'posts' }).allowed)
console.log('Can delete posts: ', bound.explain({ action: 'delete', resource: 'posts' }).allowed)
console.log('Allowed actions:  ', bound.allowedActions({ knownActions: ['read', 'delete', 'update'], resource: 'posts' }))`,
  name: 'Bound Multi-Role Access',
};
