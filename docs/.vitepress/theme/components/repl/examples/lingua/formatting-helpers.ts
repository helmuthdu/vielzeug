export const formattingHelpersExample = {
  code: `import { createI18n } from '/lingua'

const i18n = createI18n({
  locale: 'en-US',
  catalogs: {
    'en-US': { greeting: 'Hello' },
    fr: { greeting: 'Bonjour' },
  },
})

const stop = i18n.subscribe((snapshot) => {
  console.log('Snapshot:', snapshot.locale, snapshot.version)
}, { immediate: true })

await i18n.setLocale('fr')
stop()`,
  name: 'Snapshots and Subscriptions',
};
