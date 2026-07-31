export const featureResourcesExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

// Feature resources use same declared lifecycle as core catalogs.
const i18n = createI18n({
  locale: 'en',
  resources: {
    core: { en: { home: 'Home' } },
    settings: { en: async () => ({ title: 'Settings' }) },
  },
})

console.log(i18n.translate('home'))
await i18n.load('settings')
console.log(i18n.translate('title'))`,
  name: 'Feature Resources',
};
