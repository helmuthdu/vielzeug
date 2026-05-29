/**
 * Produces a stable, order-independent JSON key for an arbitrary query object.
 * Object keys are recursively sorted so `{ b: 1, a: 2 }` and `{ a: 2, b: 1 }` produce
 * the same key. Arrays are left in their original order.
 */
export const defaultKeyOf = (q: unknown): string =>
  JSON.stringify(q, (_, value: unknown) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};

      for (const k of Object.keys(value as object).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }

      return sorted;
    }

    return value;
  });
