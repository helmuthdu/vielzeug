export const variableInterpolationExample = {
  code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      deep: 'User: {user.name}',
    },
  },
})

console.log(i18n.t('greeting', { name: 'Bob' }))
console.log(i18n.t('deep', { user: { name: 'Alice' } }))`,
  name: 'Variable Interpolation',
};
