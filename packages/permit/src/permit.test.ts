import {
  ANONYMOUS,
  type BaseUser,
  createPermit,
  hasRole,
  isAnonymous,
  type PermissionData,
  type Permit,
  type PermitGuard,
  WILDCARD,
} from './permit';

describe('createPermit()', () => {
  it('creates a permit with no permissions', () => {
    expect(Object.keys(createPermit().snapshot()).length).toBe(0);
  });

  it('seeds permissions from the initial option', () => {
    const p = createPermit({
      initial: {
        admin: { comments: { delete: true }, posts: { read: true, write: true } },
        viewer: { posts: { read: true } },
      },
    });

    expect(p.check({ id: '1', roles: ['admin'] }, 'posts', 'write')).toBe(true);
    expect(p.check({ id: '1', roles: ['admin'] }, 'comments', 'delete')).toBe(true);
    expect(p.check({ id: '2', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
    expect(p.check({ id: '2', roles: ['viewer'] }, 'posts', 'write')).toBe(false);
  });

  it('calls the logger with result, user, resource, action, and data on every check', () => {
    const logger = vi.fn();
    const p = createPermit({ logger });
    p.register('admin', 'posts', { read: true });

    const user = { id: '1', roles: ['admin'] };
    const data = { authorId: '1' };
    p.check(user, 'posts', 'read', data);
    p.check(user, 'posts', 'delete');

    expect(logger).toHaveBeenCalledWith('allow', user, 'posts', 'read', data);
    expect(logger).toHaveBeenCalledWith('deny', user, 'posts', 'delete', undefined);
  });
});

describe('register()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  it('registers permissions for a role/resource pair', () => {
    permit.register('admin', 'posts', { archive: false, read: true });

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'read')).toBe(true);
    expect(permit.check(user, 'posts', 'archive')).toBe(false);
  });

  it('merges with existing permissions by default', () => {
    permit.register('admin', 'posts', { read: true });
    permit.register('admin', 'posts', { write: true });

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'read')).toBe(true);
    expect(permit.check(user, 'posts', 'write')).toBe(true);
  });

  it('remove() then register() replaces existing permissions for a resource', () => {
    permit.register('admin', 'posts', { read: true, write: true });
    permit.remove('admin', 'posts').register('admin', 'posts', { delete: true });

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'delete')).toBe(true);
    expect(permit.check(user, 'posts', 'read')).toBe(false);
    expect(permit.check(user, 'posts', 'write')).toBe(false);
  });

  it('normalizes role, resource, and action names (trims and lowercases)', () => {
    permit.register('  Admin  ', '  Posts  ', { Read: true });

    expect(permit.check({ id: '1', roles: ['ADMIN'] }, 'POSTS', 'read')).toBe(true);
    expect(permit.check({ id: '1', roles: ['ADMIN'] }, 'POSTS', 'READ')).toBe(true);
  });

  it('accepts any string as an action, not just CRUD', () => {
    permit.register('editor', 'articles', { archive: false, publish: true, 'request-review': true });

    const user = { id: '1', roles: ['editor'] };
    expect(permit.check(user, 'articles', 'publish')).toBe(true);
    expect(permit.check(user, 'articles', 'request-review')).toBe(true);
    expect(permit.check(user, 'articles', 'archive')).toBe(false);
  });

  it('throws when role or resource is empty', () => {
    expect(() => permit.register('', 'posts', { read: true })).toThrow('Role is required');
    expect(() => permit.register('admin', '', { read: true })).toThrow('Resource is required');
  });

  it('returns the permit instance to support fluent chaining', () => {
    const result = permit
      .register('admin', WILDCARD, { read: true })
      .register('editor', 'posts', { write: true })
      .register('viewer', WILDCARD, { read: true });

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
      permit.register('admin', 'posts', { archive: false, read: true });

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
      expect(permit.check(user, 'posts', 'archive')).toBe(false);
      expect(permit.check(user, 'posts', 'delete')).toBe(false); // undefined → deny
      expect(permit.check(user, 'comments', 'read')).toBe(false); // unknown resource → deny
    });
  });

  describe('dynamic (function) permissions', () => {
    it('evaluates function with user and data, denies when data is absent', () => {
      permit.register('editor', 'posts', {
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
      permit.register('writer', 'posts', { read: true, write: true });
      permit.register('moderator', 'posts', { delete: true });

      const user = { id: '1', roles: ['writer', 'moderator'] };
      expect(permit.check(user, 'posts', 'write')).toBe(true);
      expect(permit.check(user, 'posts', 'delete')).toBe(true);
    });

    it('stops at the first role that has an opinion (first-match-wins)', () => {
      permit.register('blocked', 'posts', { read: false });
      permit.register('admin', 'posts', { read: true });

      // blocked is first → its explicit false wins despite admin allowing it
      expect(permit.check({ id: '1', roles: ['blocked', 'admin'] }, 'posts', 'read')).toBe(false);
      // admin is first → its true wins
      expect(permit.check({ id: '2', roles: ['admin', 'blocked'] }, 'posts', 'read')).toBe(true);
    });
  });

  describe('wildcard role and resource', () => {
    it('wildcard role (*) applies to every authenticated user regardless of their roles', () => {
      permit.register(WILDCARD, 'posts', { read: true });

      expect(permit.check({ id: '1', roles: ['guest'] }, 'posts', 'read')).toBe(true);
      expect(permit.check({ id: '2', roles: [] }, 'posts', 'read')).toBe(true);
    });

    it('wildcard resource (*) applies to every resource', () => {
      permit.register('admin', WILDCARD, { read: true });

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
      expect(permit.check(user, 'comments', 'read')).toBe(true);
    });

    it('specific resource takes precedence over wildcard resource for the same action', () => {
      permit.register('admin', WILDCARD, { read: true });
      permit.register('admin', 'posts', { read: false }); // explicit deny on posts

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(false); // specific wins
      expect(permit.check(user, 'comments', 'read')).toBe(true); // wildcard applies
    });

    it('falls back to wildcard resource when specific resource lacks the requested action', () => {
      permit.register('admin', WILDCARD, { delete: true, read: true });
      permit.register('admin', 'posts', { write: true }); // partial override

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'write')).toBe(true); // defined on specific
      expect(permit.check(user, 'posts', 'read')).toBe(true); // falls back to wildcard
      expect(permit.check(user, 'posts', 'delete')).toBe(true); // falls back to wildcard
    });
  });

  describe('unauthenticated users', () => {
    it('treats null, missing-id, or missing-roles users as anonymous', () => {
      permit.register(ANONYMOUS, 'posts', { read: true });

      expect(permit.check(null, 'posts', 'read')).toBe(true);
      // biome-ignore lint/suspicious/noExplicitAny: testing structurally-invalid input
      expect(permit.check({ id: '1' } as any, 'posts', 'read')).toBe(true); // no roles
      // biome-ignore lint/suspicious/noExplicitAny: testing structurally-invalid input
      expect(permit.check({ roles: ['admin'] } as any, 'posts', 'read')).toBe(true); // no id
    });

    it('wildcard role also applies to unauthenticated users', () => {
      permit.register(WILDCARD, 'posts', { read: true });

      expect(permit.check(null, 'posts', 'read')).toBe(true);
    });

    it('a user with an empty roles array is authenticated and does not match anonymous', () => {
      permit.register(ANONYMOUS, 'posts', { read: true });

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

  it('returns a guard with can() covering static and dynamic permissions', () => {
    permit.register('editor', 'posts', {
      read: true,
      update: (user: BaseUser, data?: PermissionData) => user.id === data?.authorId,
    });

    const guard = permit.for({ id: '1', roles: ['editor'] });
    expect(guard.can('posts', 'read')).toBe(true);
    expect(guard.can('posts', 'update', { authorId: '1' })).toBe(true);
    expect(guard.can('posts', 'update', { authorId: '2' })).toBe(false);
    expect(guard.can('posts', 'delete')).toBe(false); // undefined → deny
  });

  it('reflects permission changes added after the guard was created', () => {
    const guard = permit.for({ id: '1', roles: ['editor'] });

    expect(guard.can('posts', 'delete')).toBe(false);
    permit.register('editor', 'posts', { delete: true });
    expect(guard.can('posts', 'delete')).toBe(true);
  });

  it('canAny() returns true if the user can perform at least one of the actions', () => {
    permit.grant('editor', 'posts', 'read');

    const guard = permit.for({ id: '1', roles: ['editor'] });
    expect(guard.canAny('posts', ['read', 'write'])).toBe(true);
    expect(guard.canAny('posts', ['write', 'delete'])).toBe(false);
  });

  it('canAll() returns true only if the user can perform every action', () => {
    permit.grant('editor', 'posts', 'read', 'write');

    const guard = permit.for({ id: '1', roles: ['editor'] });
    expect(guard.canAll('posts', ['read', 'write'])).toBe(true);
    expect(guard.canAll('posts', ['read', 'write', 'delete'])).toBe(false);
  });

  it('can() and canAny() and canAll() exist on the guard', () => {
    const guard: PermitGuard = permit.for({ id: '1', roles: ['editor'] });
    expect(typeof guard.can).toBe('function');
    expect(typeof guard.canAny).toBe('function');
    expect(typeof guard.canAll).toBe('function');
  });
});

describe('grant() and deny()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  it('grant() allows multiple actions via rest params', () => {
    permit.grant('admin', 'posts', 'read', 'write', 'delete');

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'read')).toBe(true);
    expect(permit.check(user, 'posts', 'write')).toBe(true);
    expect(permit.check(user, 'posts', 'delete')).toBe(true);
  });

  it('deny() blocks multiple actions via rest params', () => {
    permit.grant('admin', 'posts', 'read', 'write', 'delete');
    permit.deny('admin', 'posts', 'delete');

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'read')).toBe(true);
    expect(permit.check(user, 'posts', 'delete')).toBe(false);
  });

  it('grant() and deny() return the permit for fluent chaining', () => {
    const result = permit
      .grant('admin', WILDCARD, 'read')
      .deny('admin', 'posts', 'delete')
      .grant('viewer', WILDCARD, 'read');

    expect(result).toBe(permit);
    expect(permit.check({ id: '1', roles: ['admin'] }, 'comments', 'read')).toBe(true);
    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'delete')).toBe(false);
  });

  it('grant() merges with existing register() actions', () => {
    permit.register('editor', 'posts', {
      update: (user: BaseUser, data?: PermissionData) => user.id === data?.authorId,
    });
    permit.grant('editor', 'posts', 'read');

    const user = { id: '1', roles: ['editor'] };
    expect(permit.check(user, 'posts', 'read')).toBe(true);
    expect(permit.check(user, 'posts', 'update', { authorId: '1' })).toBe(true);
  });
});

describe('remove()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
    permit.grant('admin', 'posts', 'read', 'write', 'delete');
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
    permit.grant('admin', 'comments', 'read');
    permit.remove('admin');

    const user = { id: '1', roles: ['admin'] };
    expect(permit.check(user, 'posts', 'read')).toBe(false);
    expect(permit.check(user, 'comments', 'read')).toBe(false);
    expect('admin' in permit.snapshot()).toBe(false);
  });

  it('cleans up empty resource and role entries after removing the last action', () => {
    permit.grant('editor', 'posts', 'read');
    permit.remove('editor', 'posts', 'read');

    expect('editor' in permit.snapshot()).toBe(false);
  });

  it('returns the permit for fluent chaining', () => {
    const result = permit.remove('admin', 'posts', 'delete').remove('admin', 'posts').remove('admin');

    expect(result).toBe(permit);
  });

  it('is a no-op for non-existent roles, resources, and actions', () => {
    expect(() => permit.remove('ghost')).not.toThrow();
    expect(() => permit.remove('ghost', 'posts')).not.toThrow();
    expect(() => permit.remove('admin', 'ghost')).not.toThrow();
    expect(() => permit.remove('admin', 'posts', 'ghost')).not.toThrow();
  });
});

describe('snapshot()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  it('returns all registered roles and their permissions as a plain object', () => {
    permit.register('admin', 'posts', { read: true });
    permit.register('editor', 'comments', { create: true });

    const snap = permit.snapshot();
    expect(Object.keys(snap)).toEqual(['admin', 'editor']);
    expect(snap.admin.posts.read).toBe(true);
    expect(snap.editor.comments.create).toBe(true);
  });

  it('uses normalized (lowercase) keys regardless of original casing', () => {
    permit.register('Admin', 'Posts', { read: true });

    const snap = permit.snapshot();
    expect('admin' in snap).toBe(true);
    expect('Admin' in snap).toBe(false);
    expect('posts' in snap.admin).toBe(true);
  });

  it('is a deep copy — external mutations do not affect internal state', () => {
    permit.register('admin', 'posts', { read: true });

    const snap = permit.snapshot();
    delete snap.admin;
    snap.admin = { posts: { read: false } };

    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });
});

describe('restore()', () => {
  it('replaces current state from a snapshot and returns the permit for chaining', () => {
    const permit = createPermit();
    permit.grant('admin', 'posts', 'read', 'write');
    const snap = permit.snapshot();

    permit.clear();
    const result = permit.restore(snap);

    expect(result).toBe(permit);
    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'write')).toBe(true);
  });
});

describe('clear()', () => {
  it('removes all permissions and returns the permit for chaining', () => {
    const permit = createPermit();
    permit.grant('admin', 'posts', 'read');
    permit.grant('editor', 'comments', 'create');

    const result = permit.clear();

    expect(result).toBe(permit);
    expect(Object.keys(permit.snapshot()).length).toBe(0);
    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read')).toBe(false);

    permit.grant('admin', 'posts', 'delete');
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
    expect(hasRole(null, ANONYMOUS)).toBe(true);
    expect(hasRole(null, 'admin')).toBe(false);
    // biome-ignore lint/suspicious/noExplicitAny: testing structurally-invalid input
    expect(hasRole({ id: '1' } as any, ANONYMOUS)).toBe(true);
    // biome-ignore lint/suspicious/noExplicitAny: testing structurally-invalid input
    expect(hasRole({ roles: ['admin'] } as any, ANONYMOUS)).toBe(true);
  });
});

describe('isAnonymous()', () => {
  it('returns true for null, missing id, or missing roles array', () => {
    expect(isAnonymous(null)).toBe(true);
    // biome-ignore lint/suspicious/noExplicitAny: testing structurally-invalid input
    expect(isAnonymous({ roles: ['admin'] } as any)).toBe(true); // no id
    // biome-ignore lint/suspicious/noExplicitAny: testing structurally-invalid input
    expect(isAnonymous({ id: '1' } as any)).toBe(true); // no roles array
  });

  it('returns false for valid users, even with an empty roles array', () => {
    expect(isAnonymous({ id: '1', roles: ['admin'] })).toBe(false);
    expect(isAnonymous({ id: '1', roles: [] })).toBe(false);
  });
});
