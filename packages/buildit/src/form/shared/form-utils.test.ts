import {
  computeControlledCsvState,
  mapControlledValues,
  mapItemValues,
  removeItemByValue,
  removeStringValue,
  toggleItemByValue,
  toggleStringValue,
} from './form-utils';

// ─── Selection utilities ────────────────────────────────────────────────────

describe('form shared selection helpers', () => {
  it('toggles plain string values', () => {
    expect(toggleStringValue(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(toggleStringValue(['a', 'b'], 'b')).toEqual(['a']);
  });

  it('removes plain string values', () => {
    expect(removeStringValue(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  it('toggles objects by value key', () => {
    const current = [{ label: 'One', value: '1' }];

    expect(toggleItemByValue(current, { label: 'Two', value: '2' })).toEqual([
      { label: 'One', value: '1' },
      { label: 'Two', value: '2' },
    ]);
    expect(toggleItemByValue(current, { label: 'One', value: '1' })).toEqual([]);
  });

  it('removes object items by value key', () => {
    const items = [
      { label: 'One', value: '1' },
      { label: 'Two', value: '2' },
    ];

    expect(removeItemByValue(items, '2')).toEqual([{ label: 'One', value: '1' }]);
  });

  it('maps object values into string arrays', () => {
    const items = [
      { label: 'One', value: '1' },
      { label: 'Two', value: '2' },
    ];

    expect(mapItemValues(items)).toEqual(['1', '2']);
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

  it('maps normalized values into caller-specific item shapes', () => {
    const items = mapControlledValues(['us', 'gb'], (value) => ({ label: '', value }));

    expect(items).toEqual([
      { label: '', value: 'us' },
      { label: '', value: 'gb' },
    ]);
  });
});
