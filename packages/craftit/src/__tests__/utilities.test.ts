import { createId } from '../index';

describe('core/id-helpers', () => {
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
});
