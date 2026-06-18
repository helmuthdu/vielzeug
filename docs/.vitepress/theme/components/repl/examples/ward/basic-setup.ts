export const basicSetupExample = {
  code: `import { ANONYMOUS, allow, createWard } from '@vielzeug/ward'

// role accepts a string or an array of strings (OR semantics)
const ward = createWard([
  ...allow(['viewer', 'editor', 'admin'], 'posts', ['read']),
  ...allow(['editor', 'admin'],           'posts', ['update']),
  ...allow('admin',                       'posts', ['delete']),
  ...allow(ANONYMOUS,                     'posts', ['read']),
])

const viewer = { id: '1', roles: ['viewer'] }
const editor = { id: '2', roles: ['editor'] }
const admin  = { id: '3', roles: ['admin'] }

const can = (p: typeof viewer | null, action: string) =>
  ward.explain(p, 'posts', action).allowed

console.log('Viewer can read:',    can(viewer, 'read'))   // true
console.log('Viewer can update:',  can(viewer, 'update')) // false
console.log('Editor can update:',  can(editor, 'update')) // true
console.log('Admin can delete:',   can(admin,  'delete')) // true
console.log('Anonymous can read:', can(null,   'read'))   // true`,
  name: 'Basic Setup — Multi-Role Rules',
};
