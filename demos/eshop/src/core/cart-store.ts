import { computed, signal } from '@vielzeug/ripple';

import type { CartItem } from './types';

import { modelMap } from './catalog';
import { combineBreakdowns, computePriceBreakdown, scaleBreakdown } from './pricing';

export const cartItems = signal<CartItem[]>([]);

export const compareModelIds = signal<string[]>([]);

export const cartCount = computed(() => cartItems.value.reduce((sum, item) => sum + item.quantity, 0));

/** Every cart line's breakdown, scaled by its quantity — `null` entries are dropped (stale model id). */
export const cartLineBreakdowns = computed(() =>
  cartItems.value
    .map((item) => {
      const model = modelMap.value.get(item.configuration.modelId);

      if (!model) return null;

      return {
        item,
        model,
        priceBreakdown: scaleBreakdown(computePriceBreakdown(model, item.configuration), item.quantity),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
);

export const cartTotal = computed(() => combineBreakdowns(cartLineBreakdowns.value.map((l) => l.priceBreakdown)));

export const compareModels = computed(() =>
  compareModelIds.value.map((id) => modelMap.value.get(id)).filter((m): m is NonNullable<typeof m> => Boolean(m)),
);
