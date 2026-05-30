export const permissionChecksExample = {
  code: `import { createWard } from '@vielzeug/ward'

const ward = createWard([
  { role: 'editor', resource: 'articles', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'articles', action: 'create', effect: 'allow' },
  { role: 'editor', resource: 'articles', action: 'update', effect: 'allow' },
  { role: 'editor', resource: 'articles', action: 'delete', effect: 'deny' },
  { role: 'viewer', resource: 'articles', action: 'read', effect: 'allow' },
])

const editor = { id: '1', roles: ['editor'] }
const viewer = { id: '2', roles: ['viewer'] }

console.log('Editor can read:', ward.can(editor, 'articles', 'read'))
console.log('Editor can delete:', ward.can(editor, 'articles', 'delete'))
console.log('Viewer can create:', ward.can(viewer, 'articles', 'create'))
console.log('Explain delete:', ward.explain(editor, 'articles', 'delete'))`,
  name: 'Permission Checks',
};
