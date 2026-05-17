export const variableInterpolationExample = {
  code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      greeting: 'Hello, {name}!',
      deep: 'User: {user.name}',
    },
  },
})

console.log(i18n.t('greeting', { vars: { name: 'Bob' } }))
console.log(i18n.t('deep', { vars: { user: { name: 'Alice' } } }))`,
  name: 'Variable Interpolation',
};
