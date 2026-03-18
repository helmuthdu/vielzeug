import { ANONYMOUS, hasRole, isAnonymous } from '../index';

describe('hasRole()', () => {
  it('returns true when user has the role (case-insensitive), false otherwise', () => {
    const user = { id: '1', roles: ['Admin', 'Editor'] };

    expect(hasRole(user, 'admin')).toBe(true);
    expect(hasRole(user, 'EDITOR')).toBe(true);
    expect(hasRole(user, 'moderator')).toBe(false);
  });

  it('treats malformed users (null, no id, no roles) as anonymous', () => {
    expect(hasRole(null, ANONYMOUS)).toBe(true);
    expect(hasRole(null, 'admin')).toBe(false);
    expect(hasRole({ id: '1' } as any, ANONYMOUS)).toBe(true);
    expect(hasRole({ roles: ['admin'] } as any, ANONYMOUS)).toBe(true);
  });
});

describe('isAnonymous()', () => {
  it('returns true for null, missing id, or missing roles array', () => {
    expect(isAnonymous(null)).toBe(true);
    expect(isAnonymous({ roles: ['admin'] } as any)).toBe(true); // no id
    expect(isAnonymous({ id: '1' } as any)).toBe(true); // no roles array
  });

  it('returns false for valid users, even with an empty roles array', () => {
    expect(isAnonymous({ id: '1', roles: ['admin'] })).toBe(false);
    expect(isAnonymous({ id: '1', roles: [] })).toBe(false);
  });
});
