/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { ANONYMOUS, Permit, WILDCARD } from './permit';

vi.mock('@vielzeug/logit', () => ({
  Logit: {
    debug: vi.fn(),
    setPrefix: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Permit', () => {
  beforeEach(() => {
    Permit.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission Registration', () => {
    it('registers and merges permissions for role/resource', () => {
      Permit.register('admin', 'posts', { view: true });
      Permit.register('admin', 'posts', { create: true });

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'posts', 'create')).toBe(true);
    });

    it('validates required parameters and actions', () => {
      expect(() => Permit.register('', 'posts', { view: true })).toThrow('Role is required');
      expect(() => Permit.register('admin', '', { view: true })).toThrow('Resource is required');
      expect(() => Permit.register('admin', 'posts', { invalid: true } as any)).toThrow('Invalid action');
    });

    it('normalizes roles and resources (case-insensitive)', () => {
      Permit.register('Admin', 'Posts', { view: true });

      const user = { id: '1', roles: ['ADMIN'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'POSTS', 'view')).toBe(true);
    });
  });

  describe('Permission Checking', () => {
    it('allows static permissions and denies unregistered', () => {
      Permit.register('admin', 'posts', { delete: true, view: true });

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'posts', 'delete')).toBe(true);
      expect(Permit.check(user, 'posts', 'create')).toBe(false);
      expect(Permit.check(user, 'comments', 'view')).toBe(false);
    });

    it('evaluates dynamic function-based permissions with data', () => {
      Permit.register('editor', 'posts', {
        update: (user, data) => user.id === data?.authorId,
      });

      const user = { id: '1', roles: ['editor'] };
      expect(Permit.check(user, 'posts', 'update', { authorId: '1' })).toBe(true);
      expect(Permit.check(user, 'posts', 'update', { authorId: '2' })).toBe(false);
    });

    it('denies function permissions when data is undefined', () => {
      Permit.register('editor', 'posts', {
        update: (user, data) => user.id === data?.authorId,
      });

      const user = { id: '1', roles: ['editor'] };
      expect(Permit.check(user, 'posts', 'update')).toBe(false);
    });

    it('handles multiple roles with first-match-wins policy', () => {
      Permit.register('admin', 'posts', { view: true });
      Permit.register('moderator', 'posts', { delete: true });

      const user = { id: '1', roles: ['admin', 'moderator'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'posts', 'delete')).toBe(true);
    });
  });

  describe('Wildcard Permissions', () => {
    it('applies wildcard role to all users', () => {
      Permit.register(WILDCARD, 'posts', { view: true });

      const user = { id: '1', roles: ['guest'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
    });

    it('applies wildcard resource to all resources', () => {
      Permit.register('admin', WILDCARD, { view: true });

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'comments', 'view')).toBe(true);
    });

    it('prioritizes specific resource over wildcard', () => {
      Permit.register('admin', WILDCARD, { view: true });
      Permit.register('admin', 'posts', { view: false });

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(false);
      expect(Permit.check(user, 'comments', 'view')).toBe(true);
    });
  });

  describe('Malformed User Handling', () => {
    it('treats malformed users as anonymous with wildcard', () => {
      Permit.register(ANONYMOUS, 'posts', { view: true });

      const malformedUser1 = null as any;
      const malformedUser2 = { id: '1' } as any; // Missing roles
      const malformedUser3 = { roles: ['admin'] } as any; // Missing id

      expect(Permit.check(malformedUser1, 'posts', 'view')).toBe(true);
      expect(Permit.check(malformedUser2, 'posts', 'view')).toBe(true);
      expect(Permit.check(malformedUser3, 'posts', 'view')).toBe(true);
    });

    it('does not grant wildcard permissions to malformed users unless configured', () => {
      Permit.register(WILDCARD, 'posts', { delete: true });

      const malformedUser = null as any;
      // Malformed user gets WILDCARD role, so should have access
      expect(Permit.check(malformedUser, 'posts', 'delete')).toBe(true);
    });
  });

  describe('set() Method', () => {
    it('merges permissions by default', () => {
      Permit.set('admin', 'posts', { view: true });
      Permit.set('admin', 'posts', { create: true });

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'posts', 'create')).toBe(true);
    });

    it('replaces permissions when replace is true', () => {
      Permit.set('admin', 'posts', { create: true, view: true });
      Permit.set('admin', 'posts', { delete: true }, true);

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'delete')).toBe(true);
      expect(Permit.check(user, 'posts', 'view')).toBe(false);
      expect(Permit.check(user, 'posts', 'create')).toBe(false);
    });

    it('validates parameters like register', () => {
      expect(() => Permit.set('', 'posts', { view: true })).toThrow('Role is required');
      expect(() => Permit.set('admin', '', { view: true })).toThrow('Resource is required');
      expect(() => Permit.set('admin', 'posts', { bad: true } as any)).toThrow('Invalid action');
    });
  });

  describe('unregister() Method', () => {
    it('removes specific action from resource', () => {
      Permit.register('admin', 'posts', { create: true, delete: true, view: true });
      Permit.unregister('admin', 'posts', 'delete');

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'posts', 'create')).toBe(true);
      expect(Permit.check(user, 'posts', 'delete')).toBe(false);
    });

    it('removes all actions when action not specified', () => {
      Permit.register('admin', 'posts', { create: true, view: true });
      Permit.unregister('admin', 'posts');

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(false);
      expect(Permit.check(user, 'posts', 'create')).toBe(false);
    });

    it('cleans up empty resource and role entries', () => {
      Permit.register('admin', 'posts', { view: true });
      Permit.unregister('admin', 'posts', 'view');

      const roles = Permit.roles;
      expect(roles.has('admin')).toBe(false);
    });

    it('handles unregistering non-existent permissions gracefully', () => {
      expect(() => Permit.unregister('admin', 'posts', 'view')).not.toThrow();
      expect(() => Permit.unregister('admin', 'posts')).not.toThrow();
    });
  });

  describe('hasRole() Helper', () => {
    it('checks if user has specific role with normalization', () => {
      const user = { id: '1', roles: ['Admin', 'Editor'] };

      expect(Permit.hasRole(user, 'admin')).toBe(true);
      expect(Permit.hasRole(user, 'EDITOR')).toBe(true);
      expect(Permit.hasRole(user, 'moderator')).toBe(false);
    });

    it('returns true for ANONYMOUS when user is malformed', () => {
      const malformedUser = null as any;

      expect(Permit.hasRole(malformedUser, ANONYMOUS)).toBe(true);
      expect(Permit.hasRole(malformedUser, 'admin')).toBe(false);
    });
  });

  describe('roles Getter', () => {
    it('returns deep copy of all permissions', () => {
      Permit.register('admin', 'posts', { view: true });
      Permit.register('editor', 'comments', { create: true });

      const roles = Permit.roles;
      expect(roles.size).toBe(2);
      expect(roles.has('admin')).toBe(true);
      expect(roles.has('editor')).toBe(true);
    });

    it('prevents external modification of internal state', () => {
      Permit.register('admin', 'posts', { view: true });

      const roles = Permit.roles;
      roles.clear();

      // Modify nested permissions
      const adminPerms = roles.get('admin');
      if (adminPerms) {
        const postsPerms = adminPerms.get('posts');
        if (postsPerms) {
          postsPerms.view = false;
        }
      }

      // Internal state should remain unchanged
      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
    });
  });

  describe('clear() Method', () => {
    it('removes all registered permissions', () => {
      Permit.register('admin', 'posts', { view: true });
      Permit.register('editor', 'comments', { create: true });
      Permit.clear();

      const user1 = { id: '1', roles: ['admin'] };
      const user2 = { id: '2', roles: ['editor'] };
      expect(Permit.check(user1, 'posts', 'view')).toBe(false);
      expect(Permit.check(user2, 'comments', 'create')).toBe(false);
      expect(Permit.roles.size).toBe(0);
    });
  });
});
