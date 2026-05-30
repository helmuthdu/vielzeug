export const wildcardPermissionsExample = {
  code: `import { WILDCARD, createWard } from '@vielzeug/ward'

const ward = createWard([
  { role: 'admin', resource: WILDCARD, action: WILDCARD, effect: 'allow' },
  { role: 'user',  resource: 'posts',  action: 'read',   effect: 'allow' },
])

const admin = { id: '1', roles: ['admin'] }
const user  = { id: '2', roles: ['user'] }

console.log('Admin can delete users:', ward.can(admin, 'users', 'delete'))
console.log('User can read posts:',    ward.can(user,  'posts', 'read'))
console.log('User can delete posts:',  ward.can(user,  'posts', 'delete'))
// knownActions is now the required 3rd argument; no undefined placeholder needed
console.log('Known actions for admin:', ward.allowedActions(admin, 'users', ['read', 'delete', 'archive']))`,
  name: 'Wildcard Rules',
};
