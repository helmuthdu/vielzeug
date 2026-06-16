export const basicRulesExample = {
  code: `import { ANONYMOUS, WILDCARD, allow, createWard, deny } from '@vielzeug/ward'

// Role-based access control with wildcard and anonymous support
const ward = createWard([
  ...allow(WILDCARD,  'posts', ['read']),
  ...allow('editor',  'posts', ['update']),
  ...deny('blocked',  WILDCARD, [WILDCARD]),
  ...allow(ANONYMOUS, 'posts', ['read']),
])

const viewer   = { id: 'u1', roles: ['viewer'] }
const editor   = { id: 'u2', roles: ['editor'] }
const blocked  = { id: 'u3', roles: ['blocked'] }

const explain = (p: typeof viewer | null, action: string) =>
  ward.explain(p, 'posts', action).allowed

console.log('viewer  read:  ', explain(viewer,  'read'))    // true
console.log('viewer  update:', explain(viewer,  'update'))  // false
console.log('editor  update:', explain(editor,  'update'))  // true
console.log('blocked read:  ', explain(blocked, 'read'))    // false
console.log('anon    read:  ', explain(null,    'read'))    // true`,
  name: 'Basic Rules',
};
