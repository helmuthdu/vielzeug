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
});
