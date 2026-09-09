export const roleHierarchyExample = {
  code: `import { createWard } from '@vielzeug/ward'

// Simulate role hierarchy via condition callbacks
const hasRole = (role: string) => ({ principal }: { principal?: { roles: readonly string[] } | null }) =>
  principal?.roles.includes(role) ?? false

const ward = createWard([
  { action: 'read',   resource: 'posts', effect: 'allow' },
  { action: 'update', resource: 'posts', effect: 'allow', condition: hasRole('editor') },
  { action: 'delete', resource: 'posts', effect: 'allow', condition: hasRole('admin') },
])

const editor = { id: 'u1', roles: ['editor'] }
const admin  = { id: 'u2', roles: ['admin'] }
const viewer = { id: 'u3', roles: ['viewer'] }

console.log('viewer read:  ', ward.decide({ action: 'read',   principal: viewer, resource: 'posts' }).effect) // allow
console.log('editor update:', ward.decide({ action: 'update', principal: editor, resource: 'posts' }).effect) // allow
console.log('admin  delete:', ward.decide({ action: 'delete', principal: admin,  resource: 'posts' }).effect) // allow
console.log('viewer delete:', ward.decide({ action: 'delete', principal: viewer, resource: 'posts' }).effect) // deny`,
  name: 'Role Hierarchy',
};
