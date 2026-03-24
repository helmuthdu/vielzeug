import { v } from '../index';

describe('v.never()', () => {
  it('always fails', () => {
    for (const val of ['x', 0, true, null, undefined, {}]) {
      expect(() => v.never().parse(val)).toThrow('Value is not allowed');
    }
  });
});
