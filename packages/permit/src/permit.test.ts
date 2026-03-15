import {
  ANONYMOUS,
  type BaseUser,
  createPermit,
  hasRole,
  isAnonymous,
  type PermissionData,
  type Permit,
  type PermitGuard,
  type PermitState,
  WILDCARD,
} from './permit';

describe('createPermit()', () => {
  it('creates a permit with no permissions', () => {
    expect(Object.keys(createPermit().snapshot().permissions).length).toBe(0);
  });

  it('seeds permissions and hierarchy from the initial option', () => {
    const p = createPermit({
      initial: {
        permissions: {
          admin: { comments: { delete: true }, posts: { read: true, write: true } },
          viewer: { posts: { read: true } },
        },
      },
    });

    expect(p.check({ id: '1', roles: ['admin'] }, 'posts', 'write')).toBe(true);
    expect(p.check({ id: '1', roles: ['admin'] }, 'comments', 'delete')).toBe(true);
    expect(p.check({ id: '2', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
    expect(p.check({ id: '2', roles: ['viewer'] }, 'posts', 'write')).toBe(false);
  });

  it('seeds hierarchy from the initial option', () => {
    const p = createPermit({
      initial: {
        hierarchy: { admin: ['editor'] },
        permissions: { editor: { posts: { read: true } } },
      },
    });

    expect(p.check({ id: '1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });

  it('calls the logger with result, user, resource, action, and data on every check', () => {
    const logger = vi.fn();
    const p = createPermit({ logger });

    p.define('admin', 'posts', { read: true });

    const user = { id: '1', roles: ['admin'] };
    const data = { authorId: '1' };

    p.check(user, 'posts', 'read', data);
    p.check(user, 'posts', 'delete');

    expect(logger).toHaveBeenCalledWith('allow', user, 'posts', 'read', data);
    expect(logger).toHaveBeenCalledWith('deny', user, 'posts', 'delete', undefined);
  });
});

describe('define()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  it('defines permissions for a role/resource pair', () => {
    permit.define('admin', 'posts', { archive: false, read: true });

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

  it('remove() then define() replaces existing permissions for a resource', () => {
    permit.define('admin', 'posts', { read: true, write: true });
    permit.remove('admin', 'posts').define('admin', 'posts', { delete: true });

    const user = { id: '1', roles: ['admin'] };

    expect(permit.check(user, 'posts', 'delete')).toBe(true);
    expect(permit.check(user, 'posts', 'read')).toBe(false);
    expect(permit.check(user, 'posts', 'write')).toBe(false);
  });

  it('normalizes role, resource, and action names (trims and lowercases)', () => {
    permit.define('  Admin  ', '  Posts  ', { Read: true });

    expect(permit.check({ id: '1', roles: ['ADMIN'] }, 'POSTS', 'read')).toBe(true);
    expect(permit.check({ id: '1', roles: ['ADMIN'] }, 'POSTS', 'READ')).toBe(true);
  });

  it('accepts any string as an action, not just CRUD', () => {
    permit.define('editor', 'articles', { archive: false, publish: true, 'request-review': true });

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
      permit.define('admin', 'posts', { archive: false, read: true });

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
      permit.define('admin', WILDCARD, { delete: true, read: true });
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

      expect(permit.check(null, 'posts', 'read')).toBe(true);
      expect(permit.check({ id: '1' } as any, 'posts', 'read')).toBe(true); // no roles
      expect(permit.check({ roles: ['admin'] } as any, 'posts', 'read')).toBe(true); // no id
    });

    it('wildcard role also applies to unauthenticated users', () => {
      permit.define(WILDCARD, 'posts', { read: true });

      expect(permit.check(null, 'posts', 'read')).toBe(true);
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

  it('returns a guard with can() covering static and dynamic permissions', () => {
    permit.define('editor', 'posts', {
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
    permit.define('editor', 'posts', { delete: true });
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

  it('grant() merges with existing define() actions', () => {
    permit.define('editor', 'posts', {
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
    expect('admin' in permit.snapshot().permissions).toBe(false);
  });

  it('cleans up empty resource and role entries after removing the last action', () => {
    permit.grant('editor', 'posts', 'read');
    permit.remove('editor', 'posts', 'read');

    expect('editor' in permit.snapshot().permissions).toBe(false);
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

describe('extend()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  it('childRole inherits permissions from parentRole', () => {
    permit.grant('editor', 'posts', 'read', 'write');
    permit.extend('admin', 'editor');

    const admin = { id: '1', roles: ['admin'] };

    expect(permit.check(admin, 'posts', 'read')).toBe(true);
    expect(permit.check(admin, 'posts', 'write')).toBe(true);
  });

  it("childRole's own permissions take precedence over inherited ones", () => {
    permit.grant('editor', 'posts', 'read', 'write');
    permit.deny('admin', 'posts', 'write');
    permit.extend('admin', 'editor');

    const admin = { id: '1', roles: ['admin'] };

    expect(permit.check(admin, 'posts', 'read')).toBe(true); // inherited
    expect(permit.check(admin, 'posts', 'write')).toBe(false); // own deny wins
  });

  it('supports multi-level inheritance (grandparent)', () => {
    permit.grant('viewer', 'posts', 'read');
    permit.extend('editor', 'viewer');
    permit.extend('admin', 'editor');

    const admin = { id: '1', roles: ['admin'] };

    expect(permit.check(admin, 'posts', 'read')).toBe(true);
  });

  it('snapshot() includes the hierarchy, which is restored by restore()', () => {
    permit.grant('editor', 'posts', 'read', 'write');
    permit.extend('admin', 'editor');

    const state = permit.snapshot();

    expect(state.hierarchy?.admin).toEqual(['editor']);

    permit.clear();
    permit.restore(state);

    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });

  it('returns the permit for fluent chaining', () => {
    const result = permit.extend('admin', 'editor').extend('editor', 'viewer');

    expect(result).toBe(permit);
  });
});

describe('wildcard actions (*)', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  it("'*' action key grants access to any action on the resource", () => {
    permit.define('admin', 'posts', { [WILDCARD]: true });

    const user = { id: '1', roles: ['admin'] };

    expect(permit.check(user, 'posts', 'read')).toBe(true);
    expect(permit.check(user, 'posts', 'delete')).toBe(true);
    expect(permit.check(user, 'posts', 'anything')).toBe(true);
  });

  it('specific action takes precedence over wildcard action', () => {
    permit.define('admin', 'posts', { delete: false, [WILDCARD]: true });

    const user = { id: '1', roles: ['admin'] };

    expect(permit.check(user, 'posts', 'read')).toBe(true); // falls to wildcard action
    expect(permit.check(user, 'posts', 'delete')).toBe(false); // specific deny wins
  });
});

describe('wildcardFallback option', () => {
  it('when false, specific resource does not fall back to wildcard resource', () => {
    const permit = createPermit({ wildcardFallback: false });

    permit.grant('admin', WILDCARD, 'read', 'write');
    permit.grant('admin', 'posts', 'write');

    const user = { id: '1', roles: ['admin'] };

    expect(permit.check(user, 'posts', 'write')).toBe(true); // defined on specific
    expect(permit.check(user, 'posts', 'read')).toBe(false); // no fallback — specific has no 'read'
    expect(permit.check(user, 'comments', 'read')).toBe(true); // no specific entry → wildcard applies
  });

  it('when true (default), falls back to wildcard resource for undefined actions', () => {
    const permit = createPermit({ wildcardFallback: true });

    permit.grant('admin', WILDCARD, 'read');
    permit.grant('admin', 'posts', 'write');

    const user = { id: '1', roles: ['admin'] };

    expect(permit.check(user, 'posts', 'read')).toBe(true); // falls back to wildcard
  });
});

describe('define() — strict mode', () => {
  it('throws when actions object is empty and strict is true', () => {
    const permit = createPermit({ strict: true });

    expect(() => permit.define('admin', 'posts', {})).toThrow('has no actions');
  });

  it('is a silent no-op when actions is empty and strict is false (default)', () => {
    const permit = createPermit();

    expect(() => permit.define('admin', 'posts', {})).not.toThrow();
    expect(Object.keys(permit.snapshot().permissions).length).toBe(0);
  });
});

describe('snapshot()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  it('returns all registered roles and their permissions', () => {
    permit.define('admin', 'posts', { read: true });
    permit.define('editor', 'comments', { create: true });

    const { permissions } = permit.snapshot();

    expect(Object.keys(permissions)).toEqual(['admin', 'editor']);
    expect(permissions.admin.posts.read).toBe(true);
    expect(permissions.editor.comments.create).toBe(true);
  });

  it('uses normalized (lowercase) keys regardless of original casing', () => {
    permit.define('Admin', 'Posts', { read: true });

    const { permissions } = permit.snapshot();

    expect('admin' in permissions).toBe(true);
    expect('Admin' in permissions).toBe(false);
    expect('posts' in permissions.admin).toBe(true);
  });

  it('is a deep copy — external mutations do not affect internal state', () => {
    permit.define('admin', 'posts', { read: true });

    const snap = permit.snapshot();

    delete snap.permissions.admin;
    snap.permissions.admin = { posts: { read: false } };

    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });

  it('includes the role hierarchy when present', () => {
    permit.extend('admin', 'editor');

    const { hierarchy } = permit.snapshot();

    expect(hierarchy?.admin).toEqual(['editor']);
  });

  it('omits hierarchy key when no inheritance is defined', () => {
    permit.grant('admin', 'posts', 'read');

    expect(permit.snapshot().hierarchy).toBeUndefined();
  });
});

describe('restore()', () => {
  it('replaces permissions and hierarchy from a snapshot', () => {
    const permit = createPermit();

    permit.grant('admin', 'posts', 'read', 'write');
    permit.extend('superadmin', 'admin');

    const state = permit.snapshot();

    permit.clear();

    const result = permit.restore(state);

    expect(result).toBe(permit);
    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
    expect(permit.check({ id: '1', roles: ['superadmin'] }, 'posts', 'read')).toBe(true); // hierarchy restored
  });

  it('normalizes non-lowercase keys in restored permissions', () => {
    const permit = createPermit();
    const state: PermitState = { permissions: { Admin: { Posts: { read: true } } } };

    permit.restore(state);

    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });
});

describe('clear()', () => {
  it('removes all permissions and hierarchy, and returns the permit for chaining', () => {
    const permit = createPermit();

    permit.grant('admin', 'posts', 'read');
    permit.grant('editor', 'comments', 'create');
    permit.extend('superadmin', 'admin');

    const result = permit.clear();

    expect(result).toBe(permit);
    expect(Object.keys(permit.snapshot().permissions).length).toBe(0);
    expect(permit.snapshot().hierarchy).toBeUndefined();
    expect(permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read')).toBe(false);

    // verify hierarchy is truly cleared — superadmin no longer inherits from admin
    permit.grant('admin', 'posts', 'delete');
    expect(permit.check({ id: '1', roles: ['superadmin'] }, 'posts', 'delete')).toBe(false);
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

describe('checkAll() and checkAny()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
    permit.grant('editor', 'posts', 'read', 'write');
  });

  it('checkAll() returns true only when every action is permitted', () => {
    const user = { id: '1', roles: ['editor'] };

    expect(permit.checkAll(user, 'posts', ['read', 'write'])).toBe(true);
    expect(permit.checkAll(user, 'posts', ['read', 'write', 'delete'])).toBe(false);
  });

  it('checkAny() returns true when at least one action is permitted', () => {
    const user = { id: '1', roles: ['editor'] };

    expect(permit.checkAny(user, 'posts', ['read', 'delete'])).toBe(true);
    expect(permit.checkAny(user, 'posts', ['delete', 'archive'])).toBe(false);
  });

  it('matches the behaviour of the equivalent for() guard methods', () => {
    const user = { id: '1', roles: ['editor'] };
    const guard = permit.for(user);

    expect(permit.checkAll(user, 'posts', ['read', 'write'])).toBe(guard.canAll('posts', ['read', 'write']));
    expect(permit.checkAny(user, 'posts', ['read', 'delete'])).toBe(guard.canAny('posts', ['read', 'delete']));
  });
});

describe('unextend()', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
    permit.grant('editor', 'posts', 'read', 'write');
    permit.extend('admin', 'editor');
  });

  it('removes a specific parent from a child role', () => {
    permit.unextend('admin', 'editor');

    const admin = { id: '1', roles: ['admin'] };

    expect(permit.check(admin, 'posts', 'read')).toBe(false); // no longer inherited
  });

  it('removes all parents when no parentRole is specified', () => {
    permit.extend('admin', 'moderator');
    permit.grant('moderator', 'comments', 'delete');
    permit.unextend('admin');

    const admin = { id: '1', roles: ['admin'] };

    expect(permit.check(admin, 'posts', 'read')).toBe(false);
    expect(permit.check(admin, 'comments', 'delete')).toBe(false);
  });

  it('is a no-op for roles with no parents or non-existent parents', () => {
    expect(() => permit.unextend('ghost')).not.toThrow();
    expect(() => permit.unextend('admin', 'nonexistent')).not.toThrow();
  });

  it('returns the permit for fluent chaining', () => {
    expect(permit.unextend('admin', 'editor')).toBe(permit);
  });
});
