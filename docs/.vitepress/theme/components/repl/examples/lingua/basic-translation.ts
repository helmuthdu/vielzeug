export const basicTranslationExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      greeting: 'Hello, {name}!',
      farewell: 'Goodbye, {name}.',
      app: { title: 'My App', version: 'v{version}' },
    },
    de: {
      greeting: 'Hallo, {name}!',
      farewell: 'Auf Wiedersehen, {name}.',
      app: { title: 'Meine App', version: 'v{version}' },
    },
  },
})

console.log(i18n.t('greeting', { name: 'Alice' }))
// => 'Hello, Alice!'

console.log(i18n.t('app.title'))
// => 'My App'

console.log(i18n.t('app.version', { version: '2.0' }))
// => 'v2.0'

// Switch locale — synchronous when catalog is already loaded
await i18n.setLocale('de')
console.log(i18n.t('greeting', { name: 'Alice' }))
// => 'Hallo, Alice!'

console.log(i18n.t('farewell', { name: 'Bob' }))
// => 'Auf Wiedersehen, Bob.'`,
  name: 'Basic Translation',
};
