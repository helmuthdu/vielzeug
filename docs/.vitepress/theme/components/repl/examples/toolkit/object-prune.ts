export const objectPruneExample = {
  code: "import { prune } from '@vielzeug/toolkit'\n\nconst data = {\n  name: '  Alice  ',\n  age: 30,\n  tags: ['js', null, '', 'ts', undefined],\n  settings: { theme: 'dark', extra: null, empty: {} }\n}\n\nconst cleaned = prune(data)\nconsole.log('Pruned object:', cleaned)\n\n// Prune array\nconst mixed = [1, null, 2, undefined, '', 3]\nconsole.log('Pruned array:', prune(mixed))\n\n// Prune string\nconsole.log('Trimmed:', prune('  hello world  '))\nconsole.log('Empty string:', prune('    ')) // undefined",
  name: 'prune - Remove empty values',
};
