import { appliedPromoCode, cartItems, compareModelIds, savedModelIds } from './cart-store';
import { modelMap } from './catalog';
import { bus } from './events';
import { t } from './i18n';
import type { CartItem, Configuration } from './types';

/**
 * Direct cart/compare/saved mutations — every view calls into this module rather than writing to
 * `cart-store.ts`'s signals itself. The cart exposes a visible, time-limited removal recovery action
 * through `restoreCartItem`; it does not retain a hidden document-style undo history.
 */

const MAX_QUANTITY = 5;
const MAX_COMPARE = 3;

export function addToCart(configuration: Configuration): string | null {
  const model = modelMap.value.get(configuration.modelId);
  if (!model || model.availability === 'coming-soon') return null;

  const id = crypto.randomUUID();
  const item: CartItem = { addedAt: new Date().toISOString(), configuration, id, quantity: 1 };

  cartItems.value = [...cartItems.value, item];
  bus.emit('cart:item-added', { modelId: configuration.modelId });

  return id;
}

export function removeFromCart(itemId: string): void {
  if (!cartItems.value.some((i) => i.id === itemId)) return;

  cartItems.value = cartItems.value.filter((i) => i.id !== itemId);
  if (cartItems.value.length === 0) appliedPromoCode.value = '';
  bus.emit('cart:item-removed', { itemId });
}

export function restoreCartItem(item: CartItem): void {
  if (!cartItems.value.some(({ id }) => id === item.id)) cartItems.value = [...cartItems.value, item];
}

export function setCartItemQuantity(itemId: string, quantity: number): void {
  const clamped = Math.max(1, Math.min(MAX_QUANTITY, Math.round(quantity)));
  const previous = cartItems.value.find((i) => i.id === itemId)?.quantity;

  if (previous === undefined || previous === clamped) return;

  cartItems.value = cartItems.value.map((i) => (i.id === itemId ? { ...i, quantity: clamped } : i));
}

export function addToCompare(modelId: string): void {
  if (compareModelIds.value.includes(modelId) || compareModelIds.value.length >= MAX_COMPARE) return;

  compareModelIds.value = [...compareModelIds.value, modelId];
  bus.emit('compare:changed', { modelIds: compareModelIds.value });
}

export function removeFromCompare(modelId: string): void {
  if (!compareModelIds.value.includes(modelId)) return;

  compareModelIds.value = compareModelIds.value.filter((id) => id !== modelId);
  bus.emit('compare:changed', { modelIds: compareModelIds.value });
}

export function replaceCompare(modelIds: string[]): void {
  compareModelIds.value = [...new Set(modelIds)].filter((id) => modelMap.value.has(id)).slice(0, MAX_COMPARE);
  bus.emit('compare:changed', { modelIds: compareModelIds.value });
}

/** Shared by every catalog and model-detail compare action. */
export function toggleSavedModel(modelId: string): void {
  const saved = savedModelIds.value.includes(modelId);

  savedModelIds.value = saved ? savedModelIds.value.filter((id) => id !== modelId) : [...savedModelIds.value, modelId];
  bus.emit('toast:show', { message: t(saved ? 'saved.removed' : 'saved.added'), variant: saved ? 'info' : 'success' });
}

export function toggleCompare(modelId: string): void {
  if (compareModelIds.value.includes(modelId)) {
    removeFromCompare(modelId);
    bus.emit('toast:show', { message: t('compare.removed'), variant: 'info' });

    return;
  }

  if (compareModelIds.value.length >= MAX_COMPARE) {
    bus.emit('toast:show', { message: t('compare.limitReached'), variant: 'info' });

    return;
  }

  addToCompare(modelId);
  bus.emit('toast:show', {
    message: t('compare.added', { count: compareModelIds.value.length }),
    variant: 'success',
  });
}
