export const wildcardPermissionsExample = {
  code: `import { WILDCARD, allow, createWard } from '@vielzeug/ward'

const ward = createWard([
  ...allow('admin', WILDCARD, [WILDCARD]),
  ...allow('user',  'posts',  ['read']),
])

const admin = { id: '1', roles: ['admin'] }
const user  = { id: '2', roles: ['user'] }

const can = (p: typeof admin, resource: string, action: string) =>
  ward.explain(p, resource, action).allowed

console.log('Admin can delete users:', can(admin, 'users', 'delete'))
console.log('User can read posts:',    can(user,  'posts', 'read'))
console.log('User can delete posts:',  can(user,  'posts', 'delete'))
console.log('Known actions for admin:', ward.allowedActions(admin, 'users', ['read', 'delete', 'archive']))`,
  name: 'Wildcard Rules',
};
