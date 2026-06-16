export const pipePluralExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

// Pipe-delimited shorthand expands to a plural branch at registration time:
//   'one|other'           => { one: '...', other: '...' }
//   'zero|one|other'      => { zero: '...', one: '...', other: '...' }
const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      inbox:       'One message|{count} messages',
      likes:       'No likes|One like|{count} likes',
    },
  },
})

console.log(i18n.tp('inbox', 1))  // => 'One message'
console.log(i18n.tp('inbox', 5))  // => '5 messages'

console.log(i18n.tp('likes', 0))  // => 'No likes'
console.log(i18n.tp('likes', 1))  // => 'One like'
console.log(i18n.tp('likes', 7))  // => '7 likes'

// has() returns true for both the base key and its CLDR sub-keys
console.log('has inbox?',       i18n.has('inbox'))       // true — branch key
console.log('has inbox.one?',   i18n.has('inbox.one'))   // true
console.log('has inbox.other?', i18n.has('inbox.other')) // true
console.log('has missing?',     i18n.has('missing'))     // false`,
  name: 'Pipe-Plural Shorthand',
};
