import { s } from '../index';

describe('s.never()', () => {
  it('always fails', () => {
    for (const val of ['x', 0, true, null, undefined, {}]) {
      expect(() => s.never().parse(val)).toThrow('Value is not allowed');
    }
  });
});
