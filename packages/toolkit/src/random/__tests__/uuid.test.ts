import { uuid } from '../uuid';

describe('uuid', () => {
  it('should generate a unique identifier as a string', () => {
    const id = uuid();
    expect(typeof id).toBe('string');
  });

  it('should generate unique identifiers on consecutive calls', () => {
    const id1 = uuid();
    const id2 = uuid();
    expect(id1).not.toBe(id2);
  });

  it('should generate identifiers of reasonable length', () => {
    const id = uuid();
    expect(id.length).toBeGreaterThan(10); // Arbitrary length check
  });
});
