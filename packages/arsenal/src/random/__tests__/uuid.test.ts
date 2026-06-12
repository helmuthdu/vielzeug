import { uuid } from '../uuid';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('uuid', () => {
  it('returns a string matching UUID v4 format', () => {
    expect(uuid()).toMatch(UUID_PATTERN);
  });

  it('returns unique values on successive calls', () => {
    const a = uuid();
    const b = uuid();

    expect(a).not.toBe(b);
  });

  it('produces consistent format across multiple calls', () => {
    for (let i = 0; i < 10; i++) {
      expect(uuid()).toMatch(UUID_PATTERN);
    }
  });
});
