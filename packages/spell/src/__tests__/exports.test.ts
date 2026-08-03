import * as spell from '../index';
import { fromDefinition } from '../json';
import { isEmail } from '../predicates';

describe('public API surface', () => {
  it('keeps root focused on schemas, errors, and diagnostics', () => {
    expect(typeof spell.s.string).toBe('function');
    expect('errorsAt' in spell.diagnostics).toBe(false);
    expect('json' in spell).toBe(false);
    expect('predicates' in spell).toBe(false);
    expect('setMessages' in spell).toBe(false);
  });

  it('puts optional tooling behind explicit subpaths', () => {
    expect(typeof fromDefinition).toBe('function');
    expect(typeof isEmail).toBe('function');
  });

  it('uses one name for union and discriminated-union construction', () => {
    expect('and' in spell.s).toBe(false);
    expect('or' in spell.s).toBe(false);
    expect('variant' in spell.s).toBe(false);
    expect(typeof spell.s.union).toBe('function');
    expect(typeof spell.s.discriminatedUnion).toBe('function');
  });
});
