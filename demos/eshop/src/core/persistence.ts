import { effect } from '@vielzeug/ripple';
import { s } from '@vielzeug/spell';
import type { KeyValueVaultStore } from '@vielzeug/vault';
import { table, validatorCodec } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';
import { cartItems, compareModelIds } from './cart-store';
import { currencyFromCode, currentCurrency, setCurrency } from './currency';
import { setLocale } from './i18n';
import type { ThemePreference } from './theme';
import { accentHue, setAccentHue, setThemePreference, themePreference } from './theme';
import type { CartItem } from './types';

// ---------------------------------------------------------------------------
// Vault schema — one row per preference/collection, keyed by a fixed id, mirroring
// demos/crm/src/core/persistence.ts's single-row-per-concern shape.
// ---------------------------------------------------------------------------

type CartRow = { compareModelIds: string[]; id: 'current'; items: CartItem[] };
type PreferencesRow = {
  accentHue: number;
  currency: string;
  id: 'preferences';
  locale: 'de' | 'en';
  theme: ThemePreference;
};

const schema = {
  cart: table<CartRow, 'id'>('id'),
  preferences: table<PreferencesRow, 'id'>('id'),
};

// Persisted values cross a trust boundary (localStorage is editable by hand, by other
// tabs, or by an older app version), so each table decodes through a real `@vielzeug/spell`
// schema rather than a bare `as` cast. A row that fails validation is rejected by the codec;
// the loaders below treat a rejected read as "no saved row" and fall back to defaults, so a
// corrupt entry can never reach the in-memory signals as mistyped data.
const configurationSchema = s.object({
  colorId: s.string(),
  modelId: s.string(),
  packageIds: s.array(s.string()),
  trimId: s.string(),
  wheelId: s.string(),
});

const cartItemSchema = s.object({
  addedAt: s.string(),
  configuration: configurationSchema,
  id: s.string(),
  quantity: s.number(),
});

const cartSchema = s.object({
  compareModelIds: s.array(s.string()),
  id: s.literal('current'),
  items: s.array(cartItemSchema),
});

const preferencesSchema = s.object({
  accentHue: s.number(),
  currency: s.string(),
  id: s.literal('preferences'),
  locale: s.enum(['de', 'en']),
  theme: s.enum(['dark', 'light', 'system']),
});

const store: KeyValueVaultStore<typeof schema> = createLocalStorage({
  codecs: {
    cart: validatorCodec<CartRow>({ parse: (value) => cartSchema.parse(value) }),
    preferences: validatorCodec<PreferencesRow>({ parse: (value) => preferencesSchema.parse(value) }),
  },
  name: 'vielzeug-motors',
  schema,
});

async function loadCart(): Promise<CartRow | null> {
  try {
    const row = await store.get('cart', 'current');

    return row ?? null;
  } catch {
    // Corrupt or schema-incompatible cart — discard and re-seed from current signals.
    return null;
  }
}

async function saveCart(items: CartItem[], compare: string[]): Promise<void> {
  await store.put('cart', { compareModelIds: compare, id: 'current', items });
}

async function loadPreferences(): Promise<PreferencesRow | null> {
  try {
    const row = await store.get('preferences', 'preferences');

    return row ?? null;
  } catch {
    return null;
  }
}

async function savePreferences(prefs: Omit<PreferencesRow, 'id'>): Promise<void> {
  await store.put('preferences', { id: 'preferences', ...prefs });
}

/**
 * Hydrates cart/compare/preferences from vault-backed localStorage, then keeps every subsequent
 * change durable by writing back on every reactive update. Call once at startup, before anything
 * else reads these signals.
 */
export async function setupPersistence(): Promise<void> {
  const savedCart = await loadCart();
  const savedPrefs = await loadPreferences();

  if (savedCart) {
    cartItems.value = savedCart.items;
    compareModelIds.value = savedCart.compareModelIds;
  } else {
    await saveCart(cartItems.value, compareModelIds.value);
  }

  if (savedPrefs) {
    setThemePreference(savedPrefs.theme);
    setAccentHue(savedPrefs.accentHue);
    setCurrency(currencyFromCode(savedPrefs.currency));
    setLocale(savedPrefs.locale);
  } else {
    await savePreferences({
      accentHue: accentHue.value,
      currency: currentCurrency.value.code,
      locale: 'en',
      theme: themePreference.value,
    });
  }

  effect(() => {
    void saveCart(cartItems.value, compareModelIds.value);
  });

  effect(() => {
    void savePreferences({
      accentHue: accentHue.value,
      currency: currentCurrency.value.code,
      locale: 'en',
      theme: themePreference.value,
    });
  });
}
