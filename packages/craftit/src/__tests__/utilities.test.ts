import { createFormIds, createId, guard } from '../index';

describe('core/utilities.ts', () => {
  describe('createId()', () => {
    it('uses the default "cft-" prefix when none is supplied', () => {
      const id = createId();

      expect(id).toMatch(/^cft-/);
    });

    it('uses the supplied prefix', () => {
      const id = createId('label');

      expect(id).toMatch(/^label-/);
    });

    it('generates a different ID on each call', () => {
      const id1 = createId('x');
      const id2 = createId('x');

      expect(id1).not.toBe(id2);
    });
  });

  describe('createFormIds()', () => {
    it('generates the four ARIA-linked IDs from a given prefix and name', () => {
      const ids = createFormIds('field', 'email');

      expect(ids.fieldId).toBe('field-email');
      expect(ids.labelId).toBe('label-field-email');
      expect(ids.helperId).toBe('helper-field-email');
      expect(ids.errorId).toBe('error-field-email');
    });

    it('auto-generates a unique name segment when no name is supplied', () => {
      const idsA = createFormIds('ctrl');
      const idsB = createFormIds('ctrl');

      expect(idsA.fieldId).toMatch(/^ctrl-/);
      expect(idsA.labelId).toMatch(/^label-ctrl-/);
      expect(idsA.helperId).toMatch(/^helper-ctrl-/);
      expect(idsA.errorId).toMatch(/^error-ctrl-/);
      expect(idsA.fieldId).not.toBe(idsB.fieldId);
    });

    it('auto-generates when an empty-string name is supplied', () => {
      const ids = createFormIds('input', '');

      expect(ids.fieldId).toMatch(/^input-.+/);
    });
  });

  describe('guard()', () => {
    it('invokes the handler when the condition returns true', () => {
      const handler = vi.fn();
      const guarded = guard(() => true, handler);
      const event = new Event('click');

      guarded(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('does not invoke the handler when the condition returns false', () => {
      const handler = vi.fn();
      const guarded = guard(() => false, handler);

      guarded(new Event('click'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('re-evaluates the condition on every call, reflecting runtime changes', () => {
      const handler = vi.fn();
      let enabled = false;
      const guarded = guard(() => enabled, handler);

      guarded(new Event('click'));
      expect(handler).toHaveBeenCalledTimes(0);

      enabled = true;
      guarded(new Event('click'));
      expect(handler).toHaveBeenCalledTimes(1);

      enabled = false;
      guarded(new Event('click'));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
