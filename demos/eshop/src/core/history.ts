import type { CartItem, Configuration } from './types';

import { cartItems, compareModelIds } from './cart-store';
import { bus } from './events';

/**
 * Direct cart/compare mutations — every view calls into this module rather than writing to
 * `cart-store.ts`'s signals itself. This app deliberately does NOT keep an undo/redo history for
 * these (it used to, via `@vielzeug/ledger`): a shopping cart isn't a document a shopper expects
 * to "undo" the way they'd undo a keystroke — "Remove" already covers the only mutation that
 * matters, and a hidden `⌘Z` most shoppers would never discover mostly demonstrated the package
 * rather than solving a real need. Kept here as plain synchronous mutations instead.
 */

const MAX_QUANTITY = 5;
const MAX_COMPARE = 3;

export function addToCart(configuration: Configuration): string {
  const id = crypto.randomUUID();
  const item: CartItem = { addedAt: new Date().toISOString(), configuration, id, quantity: 1 };

  cartItems.value = [...cartItems.value, item];
  bus.emit('cart:item-added', { modelId: configuration.modelId });

  return id;
}

export function removeFromCart(itemId: string): void {
  if (!cartItems.value.some((i) => i.id === itemId)) return;

  cartItems.value = cartItems.value.filter((i) => i.id !== itemId);
  bus.emit('cart:item-removed', { itemId });
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

/** Shared by every "Add/remove compare" button — the catalog grid, the catalog hero, and the
 * model detail page's related-models rail all toggle the same `compareModelIds` list. */
export function toggleCompare(modelId: string): void {
  if (compareModelIds.value.includes(modelId)) removeFromCompare(modelId);
  else addToCompare(modelId);
}

/** Reorders the compare tray after a drag — no-ops if the order didn't actually change. */
export function reorderCompare(orderedIds: string[]): void {
  const previous = compareModelIds.value;

  if (previous.length === orderedIds.length && previous.every((id, i) => id === orderedIds[i])) return;

  compareModelIds.value = orderedIds;
}
