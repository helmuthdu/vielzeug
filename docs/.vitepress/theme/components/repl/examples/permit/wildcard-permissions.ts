export const wildcardPermissionsExample = {
  code: `import { createPermit, WILDCARD } from '@vielzeug/permit'

const permit = createPermit([
  { role: 'admin', resource: WILDCARD, action: WILDCARD, effect: 'allow' },
  { role: 'user', resource: 'posts', action: 'read', effect: 'allow' },
])

const admin = { id: '1', roles: ['admin'] }
const user = { id: '2', roles: ['user'] }

console.log('Admin can delete users:', permit.can(admin, 'users', 'delete'))
console.log('User can read posts:', permit.can(user, 'posts', 'read'))
console.log('User can delete posts:', permit.can(user, 'posts', 'delete'))
console.log('Known actions for admin:', permit.allowedActions(admin, 'users', undefined, ['read', 'delete', 'archive']))`,
  name: 'Wildcard Rules',
};
