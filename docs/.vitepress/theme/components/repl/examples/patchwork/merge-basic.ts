export const mergeBasicExample = {
  code: `import { diff, apply } from '@vielzeug/patchwork'
import { merge } from '@vielzeug/patchwork/merge'

const base = { price: 10, title: 'Doc', tags: ['a'] }
const local = { price: 10, title: 'My edit', tags: ['a', 'mine'] }
const remote = { price: 12, title: 'Doc', tags: ['a', 'theirs'] }

const { doc, conflicts } = merge(base, local, remote)
console.log(JSON.stringify(doc))
console.log(conflicts.length)
console.log(JSON.stringify(apply(local, diff(local, doc))))`,
  name: 'Merge - Three-way field-level reconciliation',
};
