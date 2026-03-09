/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import {
  ANONYMOUS,
  type BaseUser,
  createPermit,
  hasRole,
  isAnonymous,
  type PermissionData,
  type Permit,
  WILDCARD,
} from './permit';

describe('createPermit()', () => {
  it('creates a permit with no permissions', () => {
    expect(Object.keys(createPermit().snapshot()).length).toBe(0);
  });

  it('seeds permissions from the roles option', () => {
    const p = createPermit({
      roles: {
        admin: { posts: { read: true, write: true }, comments: { delete: true } },
        viewer: { posts: { read: true } },
      },
    });

    expect(p.check({ id: '1', roles: ['admin'] }, 'posts', 'write')).toBe(true);
    expect(p.check({ id: '1', roles: ['admin'] }, 'comments', 'delete')).toBe(true);
    expect(p.check({ id: '2', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
    expect(p.check({ id: '2', roles: ['viewer'] }, 'posts', 'write')).toBe(false);
  });

  it('calls the logger with result, user, resource, and action on every check', () => {
    const logger = vi.fn();
    const p = createPermit({ logger });
    p.define('admin', 'posts', { read: true });

    const user = { id: '1', roles: ['admin'] };
    p.check(user, 'posts', 'read');
    p.check(user, 'posts', 'delete');

    expect(logger).toHaveBeenCalledWith('allow', user, 'posts', 'read');
    expect(logger).toHaveBeenCalledWith('deny', user, 'posts', 'delete');
  });
});

describe('define()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  it('registers permissions for a role/resource pair', () => {
    permit.define('admin', 'posts', { read: true, archive: false });

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'read')).toBe(true);
    expect(permit.check(user, 'posts', 'archive')).toBe(false);
  });

  it('merges with existing permissions by default', () => {
    permit.define('admin', 'posts', { read: true });
    permit.define('admin', 'posts', { write: true });

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'read')).toBe(true);
    expect(permit.check(user, 'posts', 'write')).toBe(true);
  });

  it('replaces all existing permissions when replace: true', () => {
    permit.define('admin', 'posts', { read: true, write: true });
    permit.define('admin', 'posts', { delete: true }, { replace: true });

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'delete')).toBe(true);
    expect(permit.check(user, 'posts', 'read')).toBe(false);
    expect(permit.check(user, 'posts', 'write')).toBe(false);
  });

  it('normalizes role and resource names (trims and lowercases)', () => {
    permit.define('  Admin  ', '  Posts  ', { read: true });

    expect(permit.check({ id: '1', roles: ['ADMIN'] }, 'POSTS', 'read')).toBe(true);
  });

  it('accepts any string as an action, not just CRUD', () => {
    permit.define('editor', 'articles', { publish: true, 'request-review': true, archive: false });

    const user = { id: '1', roles: ['editor'] };
    expect(permit.check(user, 'articles', 'publish')).toBe(true);
    expect(permit.check(user, 'articles', 'request-review')).toBe(true);
    expect(permit.check(user, 'articles', 'archive')).toBe(false);
  });

  it('throws when role or resource is empty', () => {
    expect(() => permit.define('', 'posts', { read: true })).toThrow('Role is required');
    expect(() => permit.define('admin', '', { read: true })).toThrow('Resource is required');
  });

  it('returns the permit instance to support fluent chaining', () => {
    const result = permit
      .define('admin', WILDCARD, { read: true })
      .define('editor', 'posts', { write: true })
      .define('viewer', WILDCARD, { read: true });

    expect(result).toBe(permit);
    expect(permit.check({ id: '1', roles: ['editor'] }, 'posts', 'write')).toBe(true);
    expect(permit.check({ id: '1', roles: ['viewer'] }, 'comments', 'read')).toBe(true);
  });
});

describe('check()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  describe('static (boolean) permissions', () => {
    it('grants true, denies false, and denies undefined actions and unknown resources', () => {
      permit.define('admin', 'posts', { read: true, archive: false });

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
      expect(permit.check(user, 'posts', 'archive')).toBe(false);
      expect(permit.check(user, 'posts', 'delete')).toBe(false); // undefined → deny
      expect(permit.check(user, 'comments', 'read')).toBe(false); // unknown resource → deny
    });
  });

  describe('dynamic (function) permissions', () => {
    it('evaluates function with user and data, denies when data is absent', () => {
      permit.define('editor', 'posts', {
        update: (user: BaseUser, data?: PermissionData) => user.id === data?.authorId,
      });

      const user = { id: '1', roles: ['editor'] };
      expect(permit.check(user, 'posts', 'update', { authorId: '1' })).toBe(true);
      expect(permit.check(user, 'posts', 'update', { authorId: '2' })).toBe(false);
      expect(permit.check(user, 'posts', 'update')).toBe(false); // no data → deny
    });
  });

  describe('multi-role resolution', () => {
    it("unions permissions across all of a user's roles", () => {
      permit.define('writer', 'posts', { read: true, write: true });
      permit.define('moderator', 'posts', { delete: true });

      const user = { id: '1', roles: ['writer', 'moderator'] };
      expect(permit.check(user, 'posts', 'write')).toBe(true);
      expect(permit.check(user, 'posts', 'delete')).toBe(true);
    });

    it('stops at the first role that has an opinion (first-match-wins)', () => {
      permit.define('blocked', 'posts', { read: false });
      permit.define('admin', 'posts', { read: true });

      // blocked is first → its explicit false wins despite admin allowing it
      expect(permit.check({ id: '1', roles: ['blocked', 'admin'] }, 'posts', 'read')).toBe(false);
      // admin is first → its true wins
      expect(permit.check({ id: '2', roles: ['admin', 'blocked'] }, 'posts', 'read')).toBe(true);
    });
  });

  describe('wildcard role and resource', () => {
    it('wildcard role (*) applies to every authenticated user regardless of their roles', () => {
      permit.define(WILDCARD, 'posts', { read: true });

      expect(permit.check({ id: '1', roles: ['guest'] }, 'posts', 'read')).toBe(true);
      expect(permit.check({ id: '2', roles: [] }, 'posts', 'read')).toBe(true);
    });

    it('wildcard resource (*) applies to every resource', () => {
      permit.define('admin', WILDCARD, { read: true });

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
      expect(permit.check(user, 'comments', 'read')).toBe(true);
    });

    it('specific resource takes precedence over wildcard resource for the same action', () => {
      permit.define('admin', WILDCARD, { read: true });
      permit.define('admin', 'posts', { read: false }); // explicit deny on posts

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(false); // specific wins
      expect(permit.check(user, 'comments', 'read')).toBe(true); // wildcard applies
    });

    it('falls back to wildcard resource when specific resource lacks the requested action', () => {
      permit.define('admin', WILDCARD, { read: true, delete: true });
      permit.define('admin', 'posts', { write: true }); // partial override

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'write')).toBe(true); // defined on specific
      expect(permit.check(user, 'posts', 'read')).toBe(true); // falls back to wildcard
      expect(permit.check(user, 'posts', 'delete')).toBe(true); // falls back to wildcard
    });
  });

  describe('unauthenticated users', () => {
    it('treats null, missing-id, or missing-roles users as anonymous', () => {
      permit.define(ANONYMOUS, 'posts', { read: true });

      expect(permit.check(null as any, 'posts', 'read')).toBe(true);
      expect(permit.check({ id: '1' } as any, 'posts', 'read')).toBe(true); // no roles
      expect(permit.check({ roles: ['admin'] } as any, 'posts', 'read')).toBe(true); // no id
    });

    it('wildcard role also applies to unauthenticated users', () => {
      permit.define(WILDCARD, 'posts', { read: true });

      expect(permit.check(null as any, 'posts', 'read')).toBe(true);
    });

    it('a user with an empty roles array is authenticated and does not match anonymous', () => {
      permit.define(ANONYMOUS, 'posts', { read: true });

      // has id + roles array — authenticated, just no roles assigned
      expect(permit.check({ id: '1', roles: [] }, 'posts', 'read')).toBe(false);
    });
  });
});

describe('for()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  it('returns a pre-bound check function covering static and dynamic permissions', () => {
    permit.define('editor', 'posts', {
      read: true,
      update: (user: BaseUser, data?: PermissionData) => user.id === data?.authorId,
    });

    const can = permit.for({ id: '1', roles: ['editor'] });
    expect(can('posts', 'read')).toBe(true);
    expect(can('posts', 'update', { authorId: '1' })).toBe(true);
    expect(can('posts', 'update', { authorId: '2' })).toBe(false);
    expect(can('posts', 'delete')).toBe(false); // undefined → deny
  });

  it('reflects permission changes added after the guard was created', () => {
    const can = permit.for({ id: '1', roles: ['editor'] });

    expect(can('posts', 'delete')).toBe(false);
    permit.define('editor', 'posts', { delete: true });
    expect(can('posts', 'delete')).toBe(true);
  });
});

describe('remove()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
    permit.define('admin', 'posts', { read: true, write: true, delete: true });
  });

  it('removes a specific action, leaving others intact', () => {
    permit.remove('admin', 'posts', 'delete');

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'read')).toBe(true);
    expect(permit.check(user, 'posts', 'write')).toBe(true);
    expect(permit.check(user, 'posts', 'delete')).toBe(false);
  });

  it('removes all actions for a resource when no action is specified', () => {
    permit.remove('admin', 'posts');

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'read')).toBe(false);
    expect(permit.check(user, 'posts', 'write')).toBe(false);
  });

  it('removes the entire role when no resource is specified', () => {
    permit.define('admin', 'comments', { read: true });
    permit.remove('admin');

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'read')).toBe(false);
    expect(permit.check(user, 'comments', 'read')).toBe(false);
    expect('admin' in permit.snapshot()).toBe(false);
  });

  it('cleans up empty resource and role entries after removing the last action', () => {
    permit.define('editor', 'posts', { read: true });
    permit.remove('editor', 'posts', 'read');

    expect('editor' in permit.snapshot()).toBe(false);
  });

  it('is a no-op for non-existent roles, resources, and actions', () => {
    expect(() => permit.remove('ghost')).not.toThrow();
    expect(() => permit.remove('ghost', 'posts')).not.toThrow();
    expect(() => permit.remove('admin', 'ghost')).not.toThrow();
    expect(() => permit.remove('admin', 'posts', 'ghost' as any)).not.toThrow();
  });
});

describe('snapshot()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  it('returns all registered roles and their permissions as a plain object', () => {
    permit.define('admin', 'posts', { read: true });
    permit.define('editor', 'comments', { create: true });

    const snap = permit.snapshot();
    expect(Object.keys(snap)).toEqual(['admin', 'editor']);
    expect(snap['admin']['posts']['read']).toBe(true);
    expect(snap['editor']['comments']['create']).toBe(true);
  });

  it('uses normalized (lowercase) keys regardless of original casing', () => {
    permit.define('Admin', 'Posts', { read: true });

    const snap = permit.snapshot();
    expect('admin' in snap).toBe(true);
    expect('Admin' in snap).toBe(false);
    expect('posts' in snap['admin']).toBe(true);
  });

  it('is a deep copy — external mutations do not affect internal state', () => {
    permit.define('admin', 'posts', { read: true });

    const snap = permit.snapshot();
    delete snap['admin'];
    snap['admin'] = { posts: { read: false } };

    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });
});

describe('clear()', () => {
  it('removes all permissions and the permit can be repopulated afterwards', () => {
    const permit = createPermit();
    permit.define('admin', 'posts', { read: true });
    permit.define('editor', 'comments', { create: true });

    permit.clear();

    expect(Object.keys(permit.snapshot()).length).toBe(0);
    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read')).toBe(false);

    permit.define('admin', 'posts', { delete: true });
    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'delete')).toBe(true);
  });
});

describe('hasRole()', () => {
  it('returns true when user has the role (case-insensitive), false otherwise', () => {
    const user = { id: '1', roles: ['Admin', 'Editor'] };
    expect(hasRole(user, 'admin')).toBe(true);
    expect(hasRole(user, 'EDITOR')).toBe(true);
    expect(hasRole(user, 'moderator')).toBe(false);
  });

  it('treats malformed users (null, no id, no roles) as anonymous', () => {
    expect(hasRole(null as any, ANONYMOUS)).toBe(true);
    expect(hasRole(null as any, 'admin')).toBe(false);
    expect(hasRole({ id: '1' } as any, ANONYMOUS)).toBe(true);
    expect(hasRole({ roles: ['admin'] } as any, ANONYMOUS)).toBe(true);
  });
});

describe('isAnonymous()', () => {
  it('returns true for null, missing id, or missing roles array', () => {
    expect(isAnonymous(null as any)).toBe(true);
    expect(isAnonymous({ roles: ['admin'] } as any)).toBe(true); // no id
    expect(isAnonymous({ id: '1' } as any)).toBe(true); // no roles array
  });

  it('returns false for valid users, even with an empty roles array', () => {
    expect(isAnonymous({ id: '1', roles: ['admin'] })).toBe(false);
    expect(isAnonymous({ id: '1', roles: [] })).toBe(false);
  });
});
