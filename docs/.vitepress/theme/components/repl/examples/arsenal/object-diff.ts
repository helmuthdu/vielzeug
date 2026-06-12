export const objectDiffExample = {
  code: "import { diff } from '@vielzeug/arsenal'\n\nconst before = {\n  name: 'Alice',\n  age: 25,\n  email: 'alice@old.com',\n  settings: { theme: 'light', lang: 'en' }\n}\n\nconst after = {\n  name: 'Alice',\n  age: 26,\n  email: 'alice@new.com',\n  settings: { theme: 'dark', lang: 'en' }\n}\n\nconst changes = diff(after, before)\nconsole.log('Changes detected:', changes)",
  name: 'diff - Compare objects',
};
