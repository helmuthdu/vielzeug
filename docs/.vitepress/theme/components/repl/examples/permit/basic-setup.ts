export const basicSetupExample = {
  code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit()

permit.set([
  { role: 'admin', resource: 'users', action: 'read', effect: 'allow' },
  { role: 'admin', resource: 'users', action: 'create', effect: 'allow' },
  { role: 'admin', resource: 'users', action: 'update', effect: 'allow' },
  { role: 'admin', resource: 'users', action: 'delete', effect: 'allow' },
  { role: 'user', resource: 'profile', action: 'read', effect: 'allow' },
  { role: 'user', resource: 'profile', action: 'update', effect: 'allow' },
  { role: 'guest', resource: 'posts', action: 'read', effect: 'allow' },
])

const admin = { id: '1', roles: ['admin'] }
console.log('Admin can delete users:', permit.can(admin, 'users', 'delete'))`,
  name: 'Basic Setup - Rule Registration',
};
