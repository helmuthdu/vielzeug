import { parsePositiveNumber } from '../utils';
import { triggerValidationOnEvent } from '../validation';

describe('field helpers', () => {
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
