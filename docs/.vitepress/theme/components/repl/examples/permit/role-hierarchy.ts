export const roleHierarchyExample = {
  code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit([
  { role: 'editor',    resource: 'posts', action: 'read',   effect: 'allow' },
  { role: 'moderator', resource: 'posts', action: 'delete', effect: 'allow' },
])

const user = { id: '42', roles: ['editor', 'moderator'] }
const bound = permit.forUser(user)

console.log('Can read posts:',   bound.can('posts', 'read'))
console.log('Can delete posts:', bound.can('posts', 'delete'))
// knownActions is now the required 2nd argument
console.log('Allowed actions:',  bound.allowedActions('posts', ['read', 'delete', 'update']))`,
  name: 'Bound Multi-Role Access',
};
