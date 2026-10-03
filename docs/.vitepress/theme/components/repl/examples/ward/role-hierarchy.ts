export const roleHierarchyExample = {
  code: `import { createWard } from '@vielzeug/ward'

// Roles are declarative data on each rule: no condition callbacks needed
const ward = createWard([
  { action: 'read',   resource: 'posts', effect: 'allow' },
  { action: 'update', resource: 'posts', effect: 'allow', roles: ['editor'] },
  { action: 'delete', resource: 'posts', effect: 'allow', roles: ['admin'] },
])

const editor = { id: 'u1', roles: ['editor'] }
const admin  = { id: 'u2', roles: ['admin'] }
const viewer = { id: 'u3', roles: ['viewer'] }

console.log('viewer read:  ', ward.decide({ action: 'read',   principal: viewer, resource: 'posts' }).effect) // allow
console.log('editor update:', ward.decide({ action: 'update', principal: editor, resource: 'posts' }).effect) // allow
console.log('admin  delete:', ward.decide({ action: 'delete', principal: admin,  resource: 'posts' }).effect) // allow
console.log('viewer delete:', ward.decide({ action: 'delete', principal: viewer, resource: 'posts' }).effect) // deny`,
  name: 'Role Hierarchy',
};
