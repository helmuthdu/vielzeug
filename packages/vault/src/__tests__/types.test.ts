import { expectTypeOf } from 'vitest';

import { type KeyOf, type RecordOf, table } from '../index';

interface Hero {
  id: string;
  name: string;
}

interface Villain {
  code: string;
  id: number;
}

const schema = {
  heroes: table<Hero, 'id'>('id'),
  villains: table<Villain, 'id'>('id'),
} as const;

describe('public type contracts', () => {
  it('resolves a single table to its record and its key type', () => {
    expectTypeOf<RecordOf<typeof schema, 'heroes'>>().toEqualTypeOf<Hero>();
    expectTypeOf<KeyOf<typeof schema, 'villains'>>().toEqualTypeOf<number>();
  });

  it('resolves a table union to the union of its records and keys', () => {
    // Callers dispatching on a set of tables (a sync gateway writing whichever entity a
    // pulled record names) keep the store's table↔record correlation without casts.
    expectTypeOf<RecordOf<typeof schema, 'heroes' | 'villains'>>().toEqualTypeOf<Hero | Villain>();
    expectTypeOf<KeyOf<typeof schema, 'heroes' | 'villains'>>().toEqualTypeOf<string | number>();
  });
});
