import { describe, expect, it } from 'vitest';
import { splitIconTokens } from './reference-text';

describe('splitIconTokens', () => {
  it('replaces known card and rulebook icon names while preserving surrounding text', () => {
    expect(splitIconTokens('Pay [Stamina], then use [Attack].')).toEqual([
      'Pay ',
      { icon: '/icons/icon_stamina.svg', kind: 'icon', label: 'Stamina' },
      ', then use ',
      { colored: '/icons/icon_attack.svg', kind: 'icon', label: 'Attack' },
      '.',
    ]);
  });

  it('leaves unknown bracketed terms as text', () => {
    expect(splitIconTokens('Use [Unknown Rule].')).toEqual(['Use [Unknown Rule].']);
  });
});
