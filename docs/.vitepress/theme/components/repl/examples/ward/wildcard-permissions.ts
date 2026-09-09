export const wildcardPermissionsExample = {
  code: `import { WILDCARD, createWard } from '@vielzeug/ward'

// Wildcards match any action or resource
const ward = createWard([
  { action: WILDCARD, resource: WILDCARD, effect: 'allow', condition: ({ principal }) => principal?.roles.includes('admin') ?? false },
  { action: 'read',   resource: WILDCARD, effect: 'allow' },
  { action: WILDCARD, resource: WILDCARD, effect: 'deny' },
])

const admin  = { id: 'u1', roles: ['admin'] }
const viewer = { id: 'u2', roles: ['viewer'] }

console.log('admin  anything:', ward.decide({ action: 'delete', principal: admin,  resource: 'users' }).effect) // allow
console.log('viewer read:    ', ward.decide({ action: 'read',   principal: viewer, resource: 'posts' }).effect) // allow
console.log('viewer delete:  ', ward.decide({ action: 'delete', principal: viewer, resource: 'posts' }).effect) // deny`,
  name: 'Wildcard Permissions',
};
