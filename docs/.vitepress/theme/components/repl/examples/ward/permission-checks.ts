export const permissionChecksExample = {
  code: `import { createWard } from '@vielzeug/ward'

const ward = createWard([
  { action: 'read',   resource: 'articles', effect: 'allow' },
  { action: 'create', resource: 'articles', effect: 'allow', condition: ({ principal }) => principal?.roles.includes('editor') ?? false },
  { action: 'update', resource: 'articles', effect: 'allow', condition: ({ principal }) => principal?.roles.includes('editor') ?? false },
  { action: 'delete', resource: 'articles', effect: 'deny' },
])

const editor = { id: 'u1', roles: ['editor'] }
const guest  = { id: 'u2', roles: ['guest'] }

console.log('guest  read:  ', ward.decide({ action: 'read',   principal: guest,  resource: 'articles' }).effect) // allow
console.log('guest  create:', ward.decide({ action: 'create', principal: guest,  resource: 'articles' }).effect) // deny
console.log('editor create:', ward.decide({ action: 'create', principal: editor, resource: 'articles' }).effect) // allow
console.log('editor delete:', ward.decide({ action: 'delete', principal: editor, resource: 'articles' }).effect) // deny`,
  name: 'Permission Checks',
};
