import { InkConfigError, InkError, strokeWidths } from '../index.js';

describe('error hierarchy', () => {
  it('narrows configuration errors with instanceof InkError', () => {
    try {
      strokeWidths([{ x: 0, y: 0 }], { width: -1 });
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InkError);
      expect(error).toBeInstanceOf(InkConfigError);
      expect((error as Error).name).toBe('InkConfigError');
    }
  });
});
