export const roleHierarchyExample = {
  code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit()

permit.set([
  { role: 'editor', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'moderator', resource: 'posts', action: 'delete', effect: 'allow' },
])

const user = { id: '42', roles: ['editor', 'moderator'] }
const can = permit.forUser(user)

console.log('Can read posts:', can('posts', 'read'))
console.log('Can delete posts:', can('posts', 'delete'))`,
  name: 'Multi-Role User Access',
};
