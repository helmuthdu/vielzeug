export const objectPruneExample = {
  code: `import { prune } from '@vielzeug/arsenal'

const data = {
  name: '  Alice  ',
  age: 30,
  tags: ['js', null, '', 'ts', undefined],
  settings: { theme: 'dark', extra: null, empty: {} }
}

const cleaned = prune(data)
console.log('Pruned object:', cleaned)

// Prune array
const mixed = [1, null, 2, undefined, '', 3]
console.log('Pruned array:', prune(mixed))

// Prune string
console.log('Trimmed:', prune('  hello world  '))
console.log('Empty string:', prune('    ')) // undefined`,
  name: 'prune - Remove empty values',
};
