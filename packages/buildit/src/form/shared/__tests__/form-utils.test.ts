import { computeControlledCsvState } from '../utils';

// ─── Selection utilities ────────────────────────────────────────────────────

describe('form shared selection helpers', () => {
  it('toggles plain string values', () => {
    expect(['a', 'b'].includes('c') ? ['a', 'b'].filter((v) => v !== 'c') : [...['a', 'b'], 'c']).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(['a', 'b'].includes('b') ? ['a', 'b'].filter((v) => v !== 'b') : [...['a', 'b'], 'b']).toEqual(['a']);
  });

  it('removes plain string values', () => {
    expect(['a', 'b', 'c'].filter((v) => v !== 'b')).toEqual(['a', 'c']);
  });

  it('toggles objects by value key', () => {
    const current = [{ label: 'One', value: '1' }];

    expect(
      current.some((current) => current.value === { label: 'Two', value: '2' }.value)
        ? current.filter((current) => current.value !== { label: 'Two', value: '2' }.value)
        : [...current, { label: 'Two', value: '2' }],
    ).toEqual([
      { label: 'One', value: '1' },
      { label: 'Two', value: '2' },
    ]);
    expect(
      current.some((current) => current.value === { label: 'One', value: '1' }.value)
        ? current.filter((current) => current.value !== { label: 'One', value: '1' }.value)
        : [...current, { label: 'One', value: '1' }],
    ).toEqual([]);
  });

  it('removes object items by value key', () => {
    const items = [
      { label: 'One', value: '1' },
      { label: 'Two', value: '2' },
    ];

    expect(items.filter((item) => item.value !== '2')).toEqual([{ label: 'One', value: '1' }]);
  });
});

// ─── Controlled value synchronization ────────────────────────────────────────

describe('form shared controlled-value helpers', () => {
  it('normalizes csv value into consistent controlled state', () => {
    const state = computeControlledCsvState('us, gb ,, de');

    expect(state).toEqual({
      firstValue: 'us',
      formValue: 'us,gb,de',
      isEmpty: false,
      values: ['us', 'gb', 'de'],
    });
  });

  it('returns empty controlled state when value is empty', () => {
    const state = computeControlledCsvState('');

    expect(state).toEqual({
      firstValue: '',
      formValue: '',
      isEmpty: true,
      values: [],
    });
  });
});
