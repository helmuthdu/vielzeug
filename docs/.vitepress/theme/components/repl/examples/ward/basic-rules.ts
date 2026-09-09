export const basicRulesExample = {
  code: `import { WILDCARD, createWard } from '@vielzeug/ward'

// Ordered first-match rules — the first matching rule wins; default deny if none match
const ward = createWard([
  { action: WILDCARD, resource: WILDCARD, effect: 'deny', condition: ({ principal }) => principal?.roles.includes('blocked') ?? false },
  { action: 'read',   resource: 'posts', effect: 'allow' },
  { action: 'update', resource: 'posts', effect: 'allow', condition: ({ principal }) => principal?.roles.includes('editor') ?? false },
])

const viewer  = { id: 'u1', roles: ['viewer'] }
const editor  = { id: 'u2', roles: ['editor'] }
const blocked = { id: 'u3', roles: ['blocked'] }

console.log('viewer  read:  ', ward.decide({ action: 'read',   principal: viewer,  resource: 'posts' }).effect)  // allow
console.log('viewer  update:', ward.decide({ action: 'update', principal: viewer,  resource: 'posts' }).effect)  // deny
console.log('editor  update:', ward.decide({ action: 'update', principal: editor,  resource: 'posts' }).effect)  // allow
console.log('blocked read:  ', ward.decide({ action: 'read',   principal: blocked, resource: 'posts' }).effect)  // deny`,
  name: 'Basic Rules',
};
