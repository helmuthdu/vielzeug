import { fuzzyFilter, fuzzyScore } from '../search';

describe('fuzzyFilter', () => {
  it('filters strings', () => {
    expect(fuzzyFilter(['John Doe', 'Jane Doe'], 'doe', { threshold: 0.25 })).toEqual(['John Doe', 'Jane Doe']);
  });

  it('returns every value for an empty query', () => {
    expect(fuzzyFilter(['Alice', 'Bob'], '')).toEqual(['Alice', 'Bob']);
  });

  it('uses an explicit selection for objects', () => {
    const users = [
      { email: 'alice@example.com', name: 'Alice' },
      { email: 'bob@example.com', name: 'Bob' },
    ];

    expect(fuzzyFilter(users, 'alice', { select: (user) => [user.name, user.email] })).toEqual([users[0]]);
  });

  it('normalizes selected text when requested', () => {
    const users = [{ name: 'José' }, { name: 'John' }];

    expect(fuzzyFilter(users, 'jose', { normalize: true, select: (user) => user.name, threshold: 0.8 })).toEqual([
      users[0],
    ]);
  });
});

describe('fuzzyScore', () => {
  it('returns scored strings in descending score order', () => {
    const results = fuzzyScore(['John Doe', 'Jane Doe', 'Alice Smith'], 'john');

    expect(results[0]?.item).toBe('John Doe');
    expect(results.every((result, index) => index === 0 || results[index - 1]?.score >= result.score)).toBe(true);
  });

  it('returns all values with score 1 for an empty query', () => {
    expect(fuzzyScore(['Alice', 'Bob'], '')).toEqual([
      { item: 'Alice', score: 1 },
      { item: 'Bob', score: 1 },
    ]);
  });

  it('uses an explicit selection for objects', () => {
    const users = [
      { email: 'alice@example.com', name: 'Alice' },
      { email: 'bob@example.com', name: 'Bob' },
    ];

    expect(fuzzyScore(users, 'alice', { select: (user) => user.name })[0]?.item).toEqual(users[0]);
  });
});
