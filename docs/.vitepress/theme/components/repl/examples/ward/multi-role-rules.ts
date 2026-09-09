export const multiRoleRulesExample = {
  code: `import { createWard } from '@vielzeug/ward'

// Use condition callbacks for multi-role checks (OR semantics)
const ward = createWard([
  {
    action: 'read',
    resource: 'articles',
    effect: 'allow',
    condition: ({ principal }) => (principal?.roles.some(r => ['editor', 'reviewer', 'reader'].includes(r)) ?? false),
  },
  { action: 'read', resource: 'articles', effect: 'deny' },
])

const editor   = { id: 'u1', roles: ['editor'] }
const reviewer = { id: 'u2', roles: ['reviewer'] }
const outsider = { id: 'u3', roles: ['guest'] }

console.log('editor:  ', ward.decide({ action: 'read', principal: editor,   resource: 'articles' }).effect) // allow
console.log('reviewer:', ward.decide({ action: 'read', principal: reviewer, resource: 'articles' }).effect) // allow
console.log('outsider:', ward.decide({ action: 'read', principal: outsider, resource: 'articles' }).effect) // deny`,
  name: 'Multi-Role Rules',
};
