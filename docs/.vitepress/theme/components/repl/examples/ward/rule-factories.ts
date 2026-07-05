export const ruleFactoriesExample = {
  code: `import { allow, createWard, deny, predicate } from '@vielzeug/ward'

// Rule factories with ownership predicate
const ward = createWard([
  ...allow('viewer', 'posts', ['read']),
  ...allow('editor', 'posts', ['read', 'update']),
  // Ownership predicate — update only your own posts
  ...allow('editor', 'posts', ['update'], { when: predicate.owns('authorId') }),
  ...deny('blocked', 'posts', ['read', 'update']),
])

const editor = { id: 'u1', roles: ['editor'] }

// read: allowed (no predicate required)
console.log('read:        ', ward.explain(editor, 'posts', 'read').allowed)

// update with own post
const myPost = { authorId: 'u1' }
console.log('update own:  ', ward.explain(editor, 'posts', 'update', myPost).allowed)

// update someone else's post
const otherPost = { authorId: 'u2' }
console.log('update other:', ward.explain(editor, 'posts', 'update', otherPost).allowed)`,
  name: 'Rule Factories & Predicates',
};
