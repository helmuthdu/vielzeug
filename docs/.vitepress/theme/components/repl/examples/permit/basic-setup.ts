export const basicSetupExample = {
  code: `import { ANONYMOUS, createPermit } from '@vielzeug/permit'

// role accepts a string or an array of strings (OR semantics)
const permit = createPermit([
  { role: ['viewer', 'editor', 'admin'], resource: 'posts', action: 'read',   effect: 'allow' },
  { role: ['editor', 'admin'],           resource: 'posts', action: 'update', effect: 'allow' },
  { role: 'admin',                       resource: 'posts', action: 'delete', effect: 'allow' },
  { role: ANONYMOUS,                     resource: 'posts', action: 'read',   effect: 'allow' },
])

const viewer = { id: '1', roles: ['viewer'] }
const editor = { id: '2', roles: ['editor'] }
const admin  = { id: '3', roles: ['admin'] }

console.log('Viewer can read:',   permit.can(viewer, 'posts', 'read'))   // true
console.log('Viewer can update:', permit.can(viewer, 'posts', 'update')) // false
console.log('Editor can update:', permit.can(editor, 'posts', 'update')) // true
console.log('Admin can delete:',  permit.can(admin,  'posts', 'delete')) // true
console.log('Anonymous can read:', permit.can(null,  'posts', 'read'))   // true`,
  name: 'Basic Setup — Multi-Role Rules',
};
