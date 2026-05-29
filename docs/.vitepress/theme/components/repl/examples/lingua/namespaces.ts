export const namespacesExample = {
  code: `import { createI18n } from '/lingua'

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      nav: { home: 'Home', settings: 'Settings', logout: 'Log out' },
      errors: { notFound: 'Page not found', forbidden: 'Access denied' },
    },
  },
})

// Dot-key access works directly on t()
console.log(i18n.t('nav.home'))
console.log(i18n.t('errors.notFound'))

// scope() binds to a key prefix, reducing repetition
const nav = i18n.scope('nav')
console.log(nav.t('home'))
console.log(nav.t('settings'))
console.log(nav.has('logout'))`,
  name: 'Namespaces and scope()',
};
