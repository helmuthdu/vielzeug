import { _resetIdCounter, createId } from '../utils/id';

describe('createId()', () => {
  beforeEach(_resetIdCounter);

  it('uses the default prefix', () => {
    expect(createId()).toMatch(/^id-/);
  });

  it('uses a supplied prefix', () => {
    expect(createId('label')).toMatch(/^label-/);
  });

  it('generates a unique ID on each call', () => {
    expect(createId('item')).not.toBe(createId('item'));
  });

  it('resets through the private testing seam', () => {
    const first = createId('field');

    _resetIdCounter();

    expect(createId('field')).toBe(first);
  });
});
