export const permissionChecksExample = {
  code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit()

permit.set([
  { role: 'editor', resource: 'articles', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'articles', action: 'create', effect: 'allow' },
  { role: 'editor', resource: 'articles', action: 'update', effect: 'allow' },
  { role: 'editor', resource: 'articles', action: 'delete', effect: 'deny' },
  { role: 'viewer', resource: 'articles', action: 'read', effect: 'allow' },
])

const editor = { id: '1', roles: ['editor'] }
const viewer = { id: '2', roles: ['viewer'] }

console.log('Editor can read:', permit.can(editor, 'articles', 'read'))
console.log('Editor can delete:', permit.can(editor, 'articles', 'delete'))
console.log('Viewer can create:', permit.can(viewer, 'articles', 'create'))`,
  name: 'Permission Checks',
};
