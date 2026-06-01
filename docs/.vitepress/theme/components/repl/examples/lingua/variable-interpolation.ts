export const variableInterpolationExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      greeting: 'Hello, {name}!',
      status: '{user} has {count} unread messages',
    },
  },
})

console.log(i18n.t('greeting', { name: 'Bob' }))
console.log(i18n.t('status', { user: 'Alice', count: 5 }))`,
  name: 'Variable Interpolation',
};
