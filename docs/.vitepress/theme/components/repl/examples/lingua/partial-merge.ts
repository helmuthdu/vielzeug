export const partialMergeExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

// Base catalog loaded at startup
const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      nav: { home: 'Home', settings: 'Settings' },
    },
  },
})

console.log('Before load:', i18n.t('nav.home'))
console.log('Missing key before load:', i18n.t('settings.heading'))

// extend() registers the factory and immediately loads it — merges keys into the catalog
await i18n.extend('settings', (_locale) => Promise.resolve({
  settings: {
    heading: 'Account Settings',
    saved: 'Changes saved',
  },
}))

console.log('After load:', i18n.t('settings.heading'))
console.log('Base keys still present:', i18n.t('nav.home'))

// scope() pairs naturally with namespace keys
const s = i18n.scope('settings')
console.log(s.t('heading'))
console.log(s.t('saved'))`,
  name: 'Namespace Lazy Loading with extend()',
};
