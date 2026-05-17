export const nestedObjectsExample = {
  code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      user: { profile: { title: 'User Profile' } },
      app: { nav: { home: 'Home' } },
    },
  },
})

console.log(i18n.t('user.profile.title'))
console.log(i18n.t('app.nav.home'))`,
  name: 'Nested Message Objects',
};
