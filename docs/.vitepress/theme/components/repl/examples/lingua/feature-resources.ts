export const featureResourcesExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

const frCatalog = { home: 'Accueil' }

const i18n = createI18n({
  catalogs: { en: { home: 'Home' } },
  locale: 'en',
  loadCatalog: () => frCatalog,
})

console.log(i18n.translate('home'))

await i18n.setLocale('fr')
console.log(i18n.translate('home'))`,
  name: 'Lazy Locale Catalog',
};
