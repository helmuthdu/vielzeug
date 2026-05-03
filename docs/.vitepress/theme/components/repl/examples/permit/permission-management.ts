export const permissionManagementExample = {
  code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit()

permit.set({ role: 'user', resource: 'comments', action: 'read', effect: 'allow' })
console.log('Initial rules:', permit.rules())

permit.replace([
  { role: 'user', resource: 'comments', action: 'read', effect: 'allow' },
  { role: 'user', resource: 'comments', action: 'delete', effect: 'deny' },
])
console.log('After replace:', permit.rules())

permit.clear()
console.log('After clear:', permit.rules())`,
  name: 'Permission Management',
};
