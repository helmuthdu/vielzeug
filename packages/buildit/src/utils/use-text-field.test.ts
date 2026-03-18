import {
  parseCsvValues,
  parsePositiveNumber,
  resolveCounterState,
  resolveMergedAssistiveText,
  resolveSplitAssistiveText,
  stringifyCsvValues,
  triggerValidationOnEvent,
} from './use-text-field';

describe('use-text-field helpers', () => {
  describe('parsePositiveNumber', () => {
    it('returns null for nullish and invalid values', () => {
      expect(parsePositiveNumber(undefined)).toBeNull();
      expect(parsePositiveNumber(null)).toBeNull();
      expect(parsePositiveNumber('')).toBeNull();
      expect(parsePositiveNumber('abc')).toBeNull();
      expect(parsePositiveNumber(0)).toBeNull();
      expect(parsePositiveNumber(-3)).toBeNull();
    });

    it('returns numbers for positive numeric inputs', () => {
      expect(parsePositiveNumber(1)).toBe(1);
      expect(parsePositiveNumber('12')).toBe(12);
      expect(parsePositiveNumber(2.5)).toBe(2.5);
    });
  });

  describe('CSV helpers', () => {
    it('parses csv strings into trimmed value arrays', () => {
      expect(parseCsvValues('us, gb ,de')).toEqual(['us', 'gb', 'de']);
      expect(parseCsvValues(' us ,, , gb ')).toEqual(['us', 'gb']);
    });

    it('returns empty array for empty or undefined csv values', () => {
      expect(parseCsvValues('')).toEqual([]);
      expect(parseCsvValues(undefined)).toEqual([]);
    });

    it('serializes value arrays into csv strings', () => {
      expect(stringifyCsvValues(['us', 'gb'])).toBe('us,gb');
      expect(stringifyCsvValues([])).toBe('');
    });
  });

  describe('resolveSplitAssistiveText', () => {
    it('prefers error and hides helper when error is present', () => {
      const state = resolveSplitAssistiveText('Bad value', 'Helpful hint');

      expect(state.errorHidden).toBe(false);
      expect(state.errorText).toBe('Bad value');
      expect(state.helperHidden).toBe(true);
      expect(state.helperText).toBe('Helpful hint');
    });

    it('shows helper when no error exists', () => {
      const state = resolveSplitAssistiveText('', 'Helpful hint');

      expect(state.errorHidden).toBe(true);
      expect(state.helperHidden).toBe(false);
      expect(state.helperText).toBe('Helpful hint');
    });
  });

  describe('resolveMergedAssistiveText', () => {
    it('returns error text in error mode', () => {
      const state = resolveMergedAssistiveText('Required', 'Hint');

      expect(state.text).toBe('Required');
      expect(state.hidden).toBe(false);
      expect(state.isError).toBe(true);
    });

    it('returns helper text when no error exists', () => {
      const state = resolveMergedAssistiveText('', 'Hint');

      expect(state.text).toBe('Hint');
      expect(state.hidden).toBe(false);
      expect(state.isError).toBe(false);
    });
  });

  describe('resolveCounterState', () => {
    it('hides counter when max is absent', () => {
      const state = resolveCounterState(8, null);

      expect(state.hidden).toBe(true);
      expect(state.text).toBe('');
      expect(state.nearLimit).toBe(false);
      expect(state.atLimit).toBe(false);
    });

    it('returns near-limit and at-limit flags using 90% threshold', () => {
      expect(resolveCounterState(8, 10)).toMatchObject({ atLimit: false, hidden: false, nearLimit: false });
      expect(resolveCounterState(9, 10)).toMatchObject({ atLimit: false, hidden: false, nearLimit: true });
      expect(resolveCounterState(10, 10)).toMatchObject({ atLimit: true, hidden: false, nearLimit: false });
    });
  });

  describe('triggerValidationOnEvent', () => {
    it('reports validity when form context validateOn matches the event', () => {
      const field = { reportValidity: vi.fn() };
      const formCtx = { validateOn: { value: 'change' as const } };

      triggerValidationOnEvent(formCtx, field, 'change');

      expect(field.reportValidity).toHaveBeenCalledTimes(1);
    });

    it('does not report validity when validateOn does not match', () => {
      const field = { reportValidity: vi.fn() };
      const formCtx = { validateOn: { value: 'blur' as const } };

      triggerValidationOnEvent(formCtx, field, 'change');

      expect(field.reportValidity).not.toHaveBeenCalled();
    });

    it('does not report validity without form context', () => {
      const field = { reportValidity: vi.fn() };

      triggerValidationOnEvent(undefined, field, 'blur');

      expect(field.reportValidity).not.toHaveBeenCalled();
    });
  });
});
