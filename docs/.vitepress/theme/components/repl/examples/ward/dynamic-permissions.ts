export const dynamicPermissionsExample = {
  code: `import { createWard } from '@vielzeug/ward'

// Use condition callbacks for dynamic checks (e.g. ownership)
const ward = createWard([
  {
    action: 'update',
    resource: 'posts',
    effect: 'allow',
    condition: ({ principal, attributes }) => attributes?.authorId === principal?.id,
  },
  { action: 'update', resource: 'posts', effect: 'deny' },
])

const author = { id: 'u1', roles: ['user'] }
const other  = { id: 'u2', roles: ['user'] }

console.log('author edits own post:',
  ward.decide({ action: 'update', principal: author, resource: 'posts', attributes: { authorId: 'u1' } }).effect) // allow
console.log('other edits author post:',
  ward.decide({ action: 'update', principal: other,  resource: 'posts', attributes: { authorId: 'u1' } }).effect) // deny`,
  name: 'Dynamic Permissions',
};
