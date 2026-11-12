export const diffBasicExample = {
  code: `import { apply, diff } from '@vielzeug/patchwork'

const before = { address: { zip: '1010' }, items: ['a'], rev: 1 }
const after = { address: { zip: '1020' }, items: ['a', 'b'], rev: 2 }

const patch = diff(before, after)
console.log(JSON.stringify(patch))
console.log(JSON.stringify(apply(before, patch)))`,
  name: 'Diff - Structural patches',
};
