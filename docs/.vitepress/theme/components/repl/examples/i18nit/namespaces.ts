export const namespacesExample = {
  code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      common: { hello: 'Hello' },
      errors: { notFound: 'Not found' },
    },
  },
})

console.log(i18n.t('common.hello'))
console.log(i18n.t('errors.notFound'))`,
  name: 'Namespaces with Dot Keys',
};
