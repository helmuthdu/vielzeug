export const ssrHydrationExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

// ── getState() / restoreState() ───────────────────────────────────────────────
// Use getState() on the server and restoreState() on the client
// to avoid re-fetching catalogs.

// Server: build state from a fully loaded instance
const server = createI18n({
  locale: 'de',
  catalogs: {
    en: { greeting: 'Hello!', farewell: 'Goodbye!' },
    de: { greeting: 'Hallo!', farewell: 'Auf Wiedersehen!' },
  },
})

const state = server.getState()
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

client.restoreState(state)

console.log('after hydrate — locale:', client.locale)        // 'de'
console.log('after hydrate — de loaded:', client.isLoaded('de'))  // true
console.log('greeting:', client.t('greeting'))               // 'Hallo!'

// restoreState() notifies subscribers once
let changes = 0
client.subscribe(() => { changes++ })
client.restoreState(state)
console.log('subscriber notifications:', changes)            // 1`,
  name: 'getState() / restoreState() — SSR hydration',
};
