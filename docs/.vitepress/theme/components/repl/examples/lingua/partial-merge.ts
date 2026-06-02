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

console.log('Before merge:', i18n.t('nav.home'))
console.log('Missing key before merge:', i18n.t('settings.heading'))

// merge() overlays keys without discarding the base catalog
await i18n.merge('en', async () => ({
  settings: {
    heading: 'Account Settings',
    saved: 'Changes saved',
  },
}))

console.log('After merge:', i18n.t('settings.heading'))
console.log('Base keys still present:', i18n.t('nav.home'))

// scope() pairs naturally with merged namespaces
const s = i18n.scope('settings')
console.log(s.t('heading'))
console.log(s.t('saved'))`,
  name: 'Partial Merge with scope()',
};
