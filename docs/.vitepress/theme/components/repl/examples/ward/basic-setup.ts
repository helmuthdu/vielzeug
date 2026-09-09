export const basicSetupExample = {
  code: `import { createWard } from '@vielzeug/ward'

// Simple allow/deny rules evaluated in order — first match wins
const ward = createWard([
  { action: 'read', resource: 'posts', effect: 'allow' },
  { action: 'write', resource: 'posts', effect: 'allow', condition: ({ principal }) => principal?.roles.includes('writer') ?? false },
  { action: 'delete', resource: 'posts', effect: 'deny' },
])

const user = { id: 'u1', roles: ['writer'] }

console.log('read:  ', ward.decide({ action: 'read',   principal: user, resource: 'posts' }).effect)  // allow
console.log('write: ', ward.decide({ action: 'write',  principal: user, resource: 'posts' }).effect)  // allow
console.log('delete:', ward.decide({ action: 'delete', principal: user, resource: 'posts' }).effect)  // deny`,
  name: 'Basic Setup',
};
