import { describe, expect, it } from 'vitest';

import { s, tolerate } from '../index';

describe('tolerate', () => {
  const schema = tolerate(s.object({ health: s.number(), name: s.string() }), 'legacyCount', 'oldFlag');

  it('parses records carrying tolerated keys and strips them', () => {
    const result = schema.safeParse({ health: 2, legacyCount: 4, name: 'Doe', oldFlag: true });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ health: 2, name: 'Doe' });
  });

  it('parses current-shape records unchanged', () => {
    const result = schema.safeParse({ health: 2, name: 'Doe' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ health: 2, name: 'Doe' });
  });

  it('still rejects unknown keys it does not tolerate', () => {
    const result = schema.safeParse({ futureField: 1, health: 2, name: 'Doe' });

    expect(result.success).toBe(false);
  });

  it('still validates the declared fields', () => {
    const result = schema.safeParse({ health: 'two', legacyCount: 4, name: 'Doe' });

    expect(result.success).toBe(false);
  });

  it('leaves non-object input to the wrapped schema', () => {
    const result = schema.safeParse('Doe');

    expect(result.success).toBe(false);
  });
});
