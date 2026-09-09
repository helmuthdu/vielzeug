export const permissionManagementExample = {
  code: `import { createWard } from '@vielzeug/ward'

// Rules are plain objects — build them dynamically from config or a database
const rules = [
  { action: 'read',   resource: 'comments', effect: 'allow' },
  { action: 'write',  resource: 'comments', effect: 'allow', condition: ({ principal }) => principal?.roles.includes('user') ?? false },
  { action: 'delete', resource: 'comments', effect: 'allow', condition: ({ principal }) => principal?.roles.includes('moderator') ?? false },
]

const ward = createWard(rules)

const user  = { id: 'u1', roles: ['user'] }
const mod   = { id: 'u2', roles: ['moderator'] }
const guest = { id: 'u3', roles: [] }

console.log('guest read:  ', ward.decide({ action: 'read',   principal: guest, resource: 'comments' }).effect) // allow
console.log('user  write: ', ward.decide({ action: 'write',  principal: user,  resource: 'comments' }).effect) // allow
console.log('guest write: ', ward.decide({ action: 'write',  principal: guest, resource: 'comments' }).effect) // deny
console.log('mod   delete:', ward.decide({ action: 'delete', principal: mod,   resource: 'comments' }).effect) // allow`,
  name: 'Permission Management',
};
