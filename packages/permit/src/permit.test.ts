/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { ANONYMOUS, createPermit, type Permit, WILDCARD } from './permit';

vi.mock('@vielzeug/logit', () => ({
  Logit: {
    debug: vi.fn(),
    scope: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
    })),
    setPrefix: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Permit', () => {
  let permit: Permit;

  beforeEach(() => {
    permit = createPermit();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('set()', () => {
    it('registers and merges permissions for role/resource', () => {
      permit.set('admin', 'posts', { read: true });
      permit.set('admin', 'posts', { create: true });

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
      expect(permit.check(user, 'posts', 'create')).toBe(true);
    });

    it('validates required parameters and actions', () => {
      expect(() => permit.set('', 'posts', { read: true })).toThrow('Role is required');
      expect(() => permit.set('admin', '', { read: true })).toThrow('Resource is required');
      expect(() => permit.set('admin', 'posts', { invalid: true } as any)).toThrow('Invalid action');
    });

    it('normalizes roles and resources (case-insensitive)', () => {
      permit.set('Admin', 'Posts', { read: true });

      const user = { id: '1', roles: ['ADMIN'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
      expect(permit.check(user, 'POSTS', 'read')).toBe(true);
    });

    it('merges permissions by default', () => {
      permit.set('admin', 'posts', { read: true });
      permit.set('admin', 'posts', { create: true });

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
      expect(permit.check(user, 'posts', 'create')).toBe(true);
    });

    it('replaces permissions when replace is true', () => {
      permit.set('admin', 'posts', { create: true, read: true });
      permit.set('admin', 'posts', { delete: true }, true);

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'delete')).toBe(true);
      expect(permit.check(user, 'posts', 'read')).toBe(false);
      expect(permit.check(user, 'posts', 'create')).toBe(false);
    });
  });

  describe('check()', () => {
    it('allows static permissions and denies unregistered', () => {
      permit.set('admin', 'posts', { delete: true, read: true });

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
      expect(permit.check(user, 'posts', 'delete')).toBe(true);
      expect(permit.check(user, 'posts', 'create')).toBe(false);
      expect(permit.check(user, 'comments', 'read')).toBe(false);
    });

    it('evaluates dynamic function-based permissions with data', () => {
      permit.set('editor', 'posts', {
        update: (user, data) => user.id === data?.authorId,
      });

      const user = { id: '1', roles: ['editor'] };
      expect(permit.check(user, 'posts', 'update', { authorId: '1' })).toBe(true);
      expect(permit.check(user, 'posts', 'update', { authorId: '2' })).toBe(false);
    });

    it('denies function permissions when data is undefined', () => {
      permit.set('editor', 'posts', {
        update: (user, data) => user.id === data?.authorId,
      });

      const user = { id: '1', roles: ['editor'] };
      expect(permit.check(user, 'posts', 'update')).toBe(false);
    });

    it('handles multiple roles with first-match-wins policy', () => {
      permit.set('admin', 'posts', { read: true });
      permit.set('moderator', 'posts', { delete: true });

      const user = { id: '1', roles: ['admin', 'moderator'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
      expect(permit.check(user, 'posts', 'delete')).toBe(true);
    });
  });

  describe('Wildcard Permissions', () => {
    it('applies wildcard role to all users', () => {
      permit.set(WILDCARD, 'posts', { read: true });

      const user = { id: '1', roles: ['guest'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
    });

    it('applies wildcard resource to all resources', () => {
      permit.set('admin', WILDCARD, { read: true });

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
      expect(permit.check(user, 'comments', 'read')).toBe(true);
    });

    it('prioritizes specific resource over wildcard', () => {
      permit.set('admin', WILDCARD, { read: true });
      permit.set('admin', 'posts', { read: false });

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(false);
      expect(permit.check(user, 'comments', 'read')).toBe(true);
    });
  });

  describe('Malformed User Handling', () => {
    it('treats malformed users as anonymous with wildcard', () => {
      permit.set(ANONYMOUS, 'posts', { read: true });

      const malformedUser1 = null as any;
      const malformedUser2 = { id: '1' } as any; // Missing roles
      const malformedUser3 = { roles: ['admin'] } as any; // Missing id

      expect(permit.check(malformedUser1, 'posts', 'read')).toBe(true);
      expect(permit.check(malformedUser2, 'posts', 'read')).toBe(true);
      expect(permit.check(malformedUser3, 'posts', 'read')).toBe(true);
    });

    it('does not grant wildcard permissions to malformed users unless configured', () => {
      permit.set(WILDCARD, 'posts', { delete: true });

      const malformedUser = null as any;
      expect(permit.check(malformedUser, 'posts', 'delete')).toBe(true);
    });
  });

  describe('remove()', () => {
    it('removes specific action from resource', () => {
      permit.set('admin', 'posts', { create: true, delete: true, read: true });
      permit.remove('admin', 'posts', 'delete');

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
      expect(permit.check(user, 'posts', 'create')).toBe(true);
      expect(permit.check(user, 'posts', 'delete')).toBe(false);
    });

    it('removes all actions when action not specified', () => {
      permit.set('admin', 'posts', { create: true, read: true });
      permit.remove('admin', 'posts');

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(false);
      expect(permit.check(user, 'posts', 'create')).toBe(false);
    });

    it('cleans up empty resource and role entries', () => {
      permit.set('admin', 'posts', { read: true });
      permit.remove('admin', 'posts', 'read');

      expect(permit.roles.has('admin')).toBe(false);
    });

    it('handles removing non-existent permissions gracefully', () => {
      expect(() => permit.remove('admin', 'posts', 'read')).not.toThrow();
      expect(() => permit.remove('admin', 'posts')).not.toThrow();
    });
  });

  describe('hasRole()', () => {
    it('checks if user has specific role with normalization', () => {
      const user = { id: '1', roles: ['Admin', 'Editor'] };

      expect(permit.hasRole(user, 'admin')).toBe(true);
      expect(permit.hasRole(user, 'EDITOR')).toBe(true);
      expect(permit.hasRole(user, 'moderator')).toBe(false);
    });

    it('returns true for ANONYMOUS when user is malformed', () => {
      const malformedUser = null as any;

      expect(permit.hasRole(malformedUser, ANONYMOUS)).toBe(true);
      expect(permit.hasRole(malformedUser, 'admin')).toBe(false);
    });
  });

  describe('roles getter', () => {
    it('returns deep copy of all permissions', () => {
      permit.set('admin', 'posts', { read: true });
      permit.set('editor', 'comments', { create: true });

      const roles = permit.roles;
      expect(roles.size).toBe(2);
      expect(roles.has('admin')).toBe(true);
      expect(roles.has('editor')).toBe(true);
    });

    it('prevents external modification of internal state', () => {
      permit.set('admin', 'posts', { read: true });

      const roles = permit.roles;
      roles.clear();

      const adminPerms = roles.get('admin');
      if (adminPerms) {
        const postsPerms = adminPerms.get('posts');
        if (postsPerms) postsPerms.read = false;
      }

      const user = { id: '1', roles: ['admin'] };
      expect(permit.check(user, 'posts', 'read')).toBe(true);
    });
  });

  describe('clear()', () => {
    it('removes all registered permissions', () => {
      permit.set('admin', 'posts', { read: true });
      permit.set('editor', 'comments', { create: true });
      permit.clear();

      const user1 = { id: '1', roles: ['admin'] };
      const user2 = { id: '2', roles: ['editor'] };
      expect(permit.check(user1, 'posts', 'read')).toBe(false);
      expect(permit.check(user2, 'comments', 'create')).toBe(false);
      expect(permit.roles.size).toBe(0);
    });
  });
});
