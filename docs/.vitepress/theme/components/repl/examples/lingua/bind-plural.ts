export const bindPluralExample = {
  code: `import { createI18n, serializeI18n, hydrateI18n } from '@vielzeug/lingua'

// ── serializeI18n / hydrateI18n ───────────────────────────────────────────────
// Use serializeI18n() on the server and hydrateI18n() on the client
// to avoid re-fetching catalogs.

// Server: build state from a fully loaded instance
const server = createI18n({
  locale: 'de',
  catalogs: {
    en: { greeting: 'Hello!', farewell: 'Goodbye!' },
    de: { greeting: 'Hallo!', farewell: 'Auf Wiedersehen!' },
  },
})

const state = serializeI18n(server)
console.log('serialized locale:', state.locale)            // 'de'
console.log('serialized keys:', Object.keys(state.catalogs)) // ['en', 'de']

// Client: start with lazy loaders, then hydrate from server state
const client = createI18n({
  locale: 'en',
  catalogs: {
    en: { greeting: 'Hello!', farewell: 'Goodbye!' },
    de: async () => ({ greeting: 'Hallo!', farewell: 'Auf Wiedersehen!' }),
  },
})

console.log('before hydrate — locale:', client.locale)       // 'en'
console.log('before hydrate — de loaded:', client.isLoaded('de')) // false

hydrateI18n(client, state)

console.log('after hydrate — locale:', client.locale)        // 'de'
console.log('after hydrate — de loaded:', client.isLoaded('de'))  // true
console.log('greeting:', client.t('greeting'))               // 'Hallo!'

// hydrateI18n notifies subscribers once
let changes = 0
client.subscribe(() => { changes++ })
hydrateI18n(client, state)
console.log('subscriber notifications:', changes)            // 1`,
  name: 'serializeI18n() / hydrateI18n() — SSR hydration',
};
