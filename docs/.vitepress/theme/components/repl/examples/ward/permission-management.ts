export const permissionManagementExample = {
  code: `import { createWard } from '@vielzeug/ward'

const ward = createWard([
  { role: 'user', resource: 'comments', action: 'read', effect: 'allow' },
  { role: 'moderator', resource: 'comments', action: 'delete', effect: 'allow' },
  { role: 'banned', resource: 'comments', action: 'delete', effect: 'deny', priority: 100 },
])

const moderator = { id: 'm1', roles: ['moderator'] }
const bannedModerator = { id: 'm2', roles: ['moderator', 'banned'] }

console.log('Rules in scope for moderator:', ward.rulesInScope(moderator, 'comments'))
console.log('Single decision:', ward.explain(bannedModerator, 'comments', 'delete'))
console.log('Batch decisions:', ward.checkAll(bannedModerator, [
  { resource: 'comments', action: 'read' },
  { resource: 'comments', action: 'delete' },
]))`,
  name: 'Introspection and Batch Decisions',
};
