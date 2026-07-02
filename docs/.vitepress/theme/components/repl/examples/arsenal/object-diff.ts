export const objectDiffExample = {
  code: `import { diff } from '@vielzeug/arsenal'

const before = {
  name: 'Alice',
  age: 25,
  email: 'alice@old.com',
  settings: { theme: 'light', lang: 'en' }
}

const after = {
  name: 'Alice',
  age: 26,
  email: 'alice@new.com',
  settings: { theme: 'dark', lang: 'en' }
}

const changes = diff(after, before)
console.log('Changes detected:', changes)`,
  name: 'diff - Compare objects',
};
