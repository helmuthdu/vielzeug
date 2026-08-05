import type { Adapter } from '@vielzeug/vault';

import { effect } from '@vielzeug/ripple';
import { createLocalStorage, table } from '@vielzeug/vault';

import type { ThemePreference } from './theme';
import type { CartItem } from './types';

import { cartItems, compareModelIds } from './cart-store';
import { currencyFromCode, currentCurrency, setCurrency } from './currency';
import { setLocale } from './i18n';
import { accentHue, setAccentHue, setThemePreference, themePreference } from './theme';

// ---------------------------------------------------------------------------
// Vault schema — one row per preference/collection, keyed by a fixed id, mirroring
// demos/kanban/src/core/persistence.ts's single-row-per-concern shape.
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
  cart: table<CartRow>('id'),
  preferences: table<PreferencesRow>('id'),
};

const store: Adapter<typeof schema> = createLocalStorage({ name: 'vielzeug-motors', schema });

async function loadCart(): Promise<CartRow | null> {
  const row = (await store.get('cart', 'current')) as CartRow | undefined;

  return row ?? null;
}

async function saveCart(items: CartItem[], compare: string[]): Promise<void> {
  await store.put('cart', { compareModelIds: compare, id: 'current', items } as never);
}

async function loadPreferences(): Promise<PreferencesRow | null> {
  const row = (await store.get('preferences', 'preferences')) as PreferencesRow | undefined;

  return row ?? null;
}

async function savePreferences(prefs: Omit<PreferencesRow, 'id'>): Promise<void> {
  await store.put('preferences', { id: 'preferences', ...prefs } as never);
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
