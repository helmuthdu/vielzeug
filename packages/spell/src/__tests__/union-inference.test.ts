import { describe, expect, it } from 'vitest';
import type { Infer } from '../index';
import { s } from '../index';

describe('union inference', () => {
  it('keeps concrete branch types through composition', () => {
    const schema = s.union(s.record(s.string(), s.number()), s.object({ anyPlants: s.number() }), s.null());
    type Cost = Infer<typeof schema>;
    // Compile-time guards: these assignments fail if union inference degrades to `unknown`.
    const record: Cost = { scales: 2 };
    const plants: Cost = { anyPlants: 2 };
    const nothing: Cost = null;

    const nested = s.object({ levels: s.array(s.object({ cost: schema })) });
    const through: Array<Infer<typeof nested>['levels'][number]['cost']> = [null];

    expect(schema.parse({ scales: 2 })).toEqual(record);
    expect(schema.parse({ anyPlants: 2 })).toEqual(plants);
    expect(schema.parse(null)).toEqual(nothing);
    expect(nested.parse({ levels: [{ cost: null }] }).levels[0].cost).toEqual(through[0]);
  });

  it('still accepts raw literal branches', () => {
    const schema = s.union('a', 'b', s.null());
    expect(schema.parse('a')).toBe('a');
    expect(schema.parse(null)).toBe(null);
  });
});
