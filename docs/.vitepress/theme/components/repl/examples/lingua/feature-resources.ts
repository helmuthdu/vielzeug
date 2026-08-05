export const featureResourcesExample = {
  code: `import { createTranslationStore } from '@vielzeug/lingua'

const i18n = createTranslationStore({
  catalogs: {
    en: { home: 'Home' },
    fr: async () => ({ home: 'Accueil' }),
  },
  locale: 'en',
})

console.log(i18n.translate('home'))
await i18n.setLocale('fr')
await i18n.load()
console.log(i18n.translate('home'))`,
  name: 'Lazy Locale Catalog',
};
