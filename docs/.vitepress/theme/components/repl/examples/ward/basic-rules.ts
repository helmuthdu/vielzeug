export const basicRulesExample = {
  code: `import { ANONYMOUS, WILDCARD, createWard } from '@vielzeug/ward'

// Role-based access control with wildcard and anonymous support
const ward = createWard([
  { role: WILDCARD,     resource: 'posts', action: 'read',   effect: 'allow' },
  { role: 'editor',     resource: 'posts', action: 'update', effect: 'allow' },
  { role: 'blocked',    resource: 'posts', action: WILDCARD, effect: 'deny'  },
  { role: ANONYMOUS,    resource: 'posts', action: 'read',   effect: 'allow' },
])

const viewer   = { id: 'u1', roles: ['viewer'] }
const editor   = { id: 'u2', roles: ['editor'] }
const blocked  = { id: 'u3', roles: ['blocked'] }

console.log('viewer  read:  ', ward.can(viewer,  'posts', 'read'))    // true
console.log('viewer  update:', ward.can(viewer,  'posts', 'update'))  // false
console.log('editor  update:', ward.can(editor,  'posts', 'update'))  // true
console.log('blocked read:  ', ward.can(blocked, 'posts', 'read'))    // false
console.log('anon    read:  ', ward.can(null,    'posts', 'read'))    // true`,
  name: 'Basic Rules',
};
