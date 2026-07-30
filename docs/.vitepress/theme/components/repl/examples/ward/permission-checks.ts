export const permissionChecksExample = {
  code: `import { allow, createWard, deny } from '@vielzeug/ward'

const ward = createWard([
  ...allow('editor', 'articles', ['read', 'create', 'update']),
  ...deny('editor',  'articles', ['delete']),
  ...allow('viewer', 'articles', ['read']),
])

const editor = { id: '1', roles: ['editor'] }
const viewer = { id: '2', roles: ['viewer'] }

console.log('Editor can read:   ', ward.explain({ action: 'read', principal: editor, resource: 'articles' }).allowed)
console.log('Editor can delete: ', ward.explain({ action: 'delete', principal: editor, resource: 'articles' }).allowed)
console.log('Viewer can create: ', ward.explain({ action: 'create', principal: viewer, resource: 'articles' }).allowed)

// Full decision object with deny reason
const decision = ward.explain({ action: 'delete', principal: editor, resource: 'articles' })
if (!decision.allowed) console.log('Deny reason:', decision.reason)`,
  name: 'Permission Checks',
};
