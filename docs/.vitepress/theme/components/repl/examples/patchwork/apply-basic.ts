export const applyBasicExample = {
  code: `import { apply, getIn, tryApply } from '@vielzeug/patchwork'

const doc = { items: ['a'], title: 'Cart' }
const next = apply(doc, [
  { op: 'replace', path: '/title', value: 'Wagen' },
  { op: 'add', path: '/items/-', value: 'b' },
])
console.log(JSON.stringify(next))
console.log(getIn(next, '/items/1'))

const rejected = tryApply(doc, [{ op: 'test', path: '/title', value: 'Other' }])
console.log(JSON.stringify(rejected))`,
  name: 'Apply - Immutable patches and guarded test',
};
