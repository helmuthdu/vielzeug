export const permissionManagementExample = {
  code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit([
  { role: 'user', resource: 'comments', action: 'read', effect: 'allow' },
  { role: 'moderator', resource: 'comments', action: 'delete', effect: 'allow' },
  { role: 'banned', resource: 'comments', action: 'delete', effect: 'deny', priority: 100 },
])

const moderator = { id: 'm1', roles: ['moderator'] }
const bannedModerator = { id: 'm2', roles: ['moderator', 'banned'] }

console.log('Rules in scope for moderator:', permit.rulesInScope(moderator, 'comments'))
console.log('Single decision:', permit.explain(bannedModerator, 'comments', 'delete'))
console.log('Batch decisions:', permit.checkAll(bannedModerator, [
  { resource: 'comments', action: 'read' },
  { resource: 'comments', action: 'delete' },
]))`,
  name: 'Introspection and Batch Decisions',
};
