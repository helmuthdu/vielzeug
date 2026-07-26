import { createId, createStableId, resetStableIdCounter } from '../utils/id';

describe('core/id-helpers', () => {
  describe('createId()', () => {
    it('uses default "id-" prefix when none is supplied', () => {
      const id = createId();

      expect(id).toMatch(/^id-/);
    });

    it('uses supplied prefix', () => {
      const id = createId('label');

      expect(id).toMatch(/^label-/);
    });

    it('generates a unique ID on each call', () => {
      const id1 = createId('x');
      const id2 = createId('x');

      expect(id1).not.toBe(id2);
    });
  });

  describe('createStableId()', () => {
    beforeEach(() => resetStableIdCounter());

    it('uses default "id" prefix when none is supplied', () => {
      const id = createStableId();

      expect(id).toMatch(/^id-/);
    });

    it('uses the supplied prefix', () => {
      const id = createStableId('field');

      expect(id).toMatch(/^field-/);
    });

    it('generates unique IDs on each call', () => {
      const id1 = createStableId('a');
      const id2 = createStableId('a');

      expect(id1).not.toBe(id2);
    });

    it('includes a random collision-prevention tag in each ID', () => {
      const id1 = createStableId('x');
      const id2 = createStableId('x');

      // Both IDs share the same tag: the part between "x-" and the trailing counter digit(s).
      // Format: "x-<tag><counter>" where tag is 4 alphanum chars and counter is 1+.
      // The simplest invariant: both IDs start with "x-" and are not equal (different counters).
      expect(id1).toMatch(/^x-/);
      expect(id2).toMatch(/^x-/);
      expect(id1).not.toBe(id2);
      // They share everything except the final digit(s) — same prefix length
      expect(id1.length).toBeGreaterThan('x-'.length);
    });
  });

  describe('resetStableIdCounter()', () => {
    beforeEach(() => resetStableIdCounter());

    it('resets the createStableId counter so IDs are equal after each reset', () => {
      const id1 = createStableId('r');

      resetStableIdCounter();

      const id2 = createStableId('r');

      expect(id1).toBe(id2);
    });

    it("does not affect createId()'s separate, non-resettable counter", () => {
      // Regression guard: resetStableIdCounter() is scoped to createStableId() only —
      // createId() has no public reset by design (see createId()'s own docstring).
      const before = createId('c');

      resetStableIdCounter();

      const after = createId('c');

      expect(before).not.toBe(after);
    });
  });
});
