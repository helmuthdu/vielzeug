export const dynamicPermissionsExample = {
  code: `import { allow, createWard, predicate } from '@vielzeug/ward'

const ward = createWard([
  allow('user', 'posts', ['update'], { when: predicate.owns('authorId') }),
])

const user1 = { id: 'user1', roles: ['user'] }
const user2 = { id: 'user2', roles: ['user'] }
const post  = { id: 'post1', authorId: 'user1', title: 'My Post' }

console.log('Author can update:     ', ward.explain({ action: 'update', data: post, principal: user1, resource: 'posts' }).allowed)
console.log('Non-author can update: ', ward.explain({ action: 'update', data: post, principal: user2, resource: 'posts' }).allowed)`,
  name: 'Dynamic Permissions — Ownership Rules',
};
