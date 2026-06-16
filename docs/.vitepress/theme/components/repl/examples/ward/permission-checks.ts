export const permissionChecksExample = {
  code: `import { allow, createWard, deny } from '@vielzeug/ward'

const ward = createWard([
  ...allow('editor', 'articles', ['read', 'create', 'update']),
  ...deny('editor',  'articles', ['delete']),
  ...allow('viewer', 'articles', ['read']),
])

const editor = { id: '1', roles: ['editor'] }
const viewer = { id: '2', roles: ['viewer'] }

console.log('Editor can read:   ', ward.explain(editor, 'articles', 'read').allowed)
console.log('Editor can delete: ', ward.explain(editor, 'articles', 'delete').allowed)
console.log('Viewer can create: ', ward.explain(viewer, 'articles', 'create').allowed)

// Full decision object with deny reason
const decision = ward.explain(editor, 'articles', 'delete')
if (!decision.allowed) console.log('Deny reason:', decision.reason)`,
  name: 'Permission Checks',
};
