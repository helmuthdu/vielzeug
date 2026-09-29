import { describe, expect, test } from 'vitest';

import { createFormatter } from '../format';

describe('createFormatter', () => {
  test('remains a standalone formatting utility', () => {
    const formatter = createFormatter('en-US');

    expect(formatter.currency(9.99, 'USD')).toContain('$');
    expect(formatter.list(['A', 'B'])).toBe('A and B');
  });

  test('follows a caller-owned locale getter', () => {
    let locale = 'en-US';
    const formatter = createFormatter(() => locale);

    const english = formatter.number(1_000);

    locale = 'fr-FR';

    expect(english).toContain('1,000');
    expect(formatter.number(1_000)).not.toContain('1,000');
  });

  test('builds a fresh formatter for unserializable options instead of sharing one', () => {
    const formatter = createFormatter('en-US');

    const circular = (): Record<string, unknown> => {
      const options: Record<string, unknown> = {};
      options.self = options;

      return options;
    };

    // Both option sets contain a circular reference, so neither can be JSON-serialized.
    // They must not share one per-locale formatter: the first call formats compact, the
    // second must build its own formatter and format plainly.
    const compact = formatter.number(1_000_000, { ...circular(), notation: 'compact' } as Intl.NumberFormatOptions);
    const plain = formatter.number(1_000_000, circular() as unknown as Intl.NumberFormatOptions);

    expect(compact).toBe('1M');
    expect(plain).toBe('1,000,000');
  });
});
