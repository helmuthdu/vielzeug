export const dynamicPermissionsExample = {
  code: `import { createPermit, owns } from '@vielzeug/permit'

const permit = createPermit([
  {
    role: 'user',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: owns('authorId'),
  },
])

const user1 = { id: 'user1', roles: ['user'] }
const user2 = { id: 'user2', roles: ['user'] }
const post = { id: 'post1', authorId: 'user1', title: 'My Post' }

console.log('Author can update:', permit.can(user1, 'posts', 'update', post))
console.log('Non-author can update:', permit.can(user2, 'posts', 'update', post))`,
  name: 'Dynamic Permissions - Ownership Rules',
};
