export const objectDiffArraysExample = {
  code: `import { diffArrays } from '@vielzeug/arsenal'

// Default 'set' strategy — order independent
const v1 = [1, 2, 3]
const v2 = [2, 3, 4]
const setDiff = diffArrays(v1, v2)
console.log('set diff:', setDiff) // { added: [4], removed: [1] }

// 'lcs' strategy — ordered minimal diff
const before = [1, 2, 3, 4, 5]
const after  = [1, 3, 4, 5, 6]
const lcsDiff = diffArrays(before, after, { strategy: 'lcs' })
console.log('lcs diff:', lcsDiff) // { added: [6], removed: [2] }

// With custom compareFn for objects
const oldUsers = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
const newUsers = [{ id: 2, name: 'Bob' }, { id: 3, name: 'Charlie' }]
const userDiff = diffArrays(oldUsers, newUsers, { compareFn: (a, b) => a.id === b.id })
console.log('users:', userDiff) // { added: [{id:3,...}], removed: [{id:1,...}] }`,
  name: 'diffArrays - Set and LCS strategies',
};
