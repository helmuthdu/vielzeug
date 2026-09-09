import * as spell from '../index';
import { fromDefinition } from '../json';
import { isEmail } from '../predicates';

describe('public API surface', () => {
  it('keeps root focused on schema construction and parsing', () => {
    expect(typeof spell.s.string).toBe('function');
    expect(typeof spell.createParseContext).toBe('function');
    expect('any' in spell.s).toBe(false);
    expect('AnySchema' in spell).toBe(false);
    expect('diagnostics' in spell).toBe(false);
    expect('PipeSchema' in spell).toBe(false);
    expect('schemaMode' in spell).toBe(false);
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
