export const multiRoleRulesExample = {
  code: `import { ANONYMOUS, createWard } from '@vielzeug/ward'

// A single rule can cover multiple roles with array syntax.
// Semantics are OR: the principal must hold at least one of the listed roles.
const ward = createWard([
  // Everyone (including anonymous) can read public content
  { role: [ANONYMOUS, 'user', 'moderator', 'admin'], resource: 'articles', action: 'read',   effect: 'allow' },
  // Registered users and above can comment
  { role: ['user', 'moderator', 'admin'],            resource: 'articles', action: 'comment', effect: 'allow' },
  // Moderators and admins can remove content
  { role: ['moderator', 'admin'],                    resource: 'articles', action: 'delete',  effect: 'allow' },
  // Only admins can pin articles
  { role: 'admin',                                   resource: 'articles', action: 'pin',     effect: 'allow' },
])

const guest     = null
const user      = { id: '1', roles: ['user'] }
const moderator = { id: '2', roles: ['moderator'] }
const admin     = { id: '3', roles: ['admin'] }

const ACTIONS = ['read', 'comment', 'delete', 'pin'] as const

for (const [label, principal] of [['guest', guest], ['user', user], ['moderator', moderator], ['admin', admin]] as const) {
  const allowed = ward.allowedActions(principal, 'articles', ACTIONS)
  console.log(\`\${label} can:\`, allowed)
}`,
  name: 'Multi-Role Rules',
};
