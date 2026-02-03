import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Permit } from './permit';

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

  describe('register', () => {
    it('registers permissions for a role and resource', () => {
      Permit.register('admin', 'posts', { create: true, view: true });

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'posts', 'create')).toBe(true);
    });

    it('merges new permissions with existing ones', () => {
      Permit.register('admin', 'posts', { view: true });
      Permit.register('admin', 'posts', { create: true });

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'posts', 'create')).toBe(true);
    });

    it('throws error when role is missing', () => {
      expect(() => {
        Permit.register('', 'posts', { view: true });
      }).toThrow('Role is required');
    });

    it('throws error when resource is missing', () => {
      expect(() => {
        Permit.register('admin', '', { view: true });
      }).toThrow('Resource is required');
    });
  });

  describe('check', () => {
    it('allows registered static permissions', () => {
      Permit.register('admin', 'posts', { delete: true, view: true });

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'posts', 'delete')).toBe(true);
    });

    it('denies unregistered permissions', () => {
      Permit.register('admin', 'posts', { view: true });

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'delete')).toBe(false);
      expect(Permit.check(user, 'comments', 'view')).toBe(false);
    });

    it('handles dynamic function-based permissions', () => {
      Permit.register('editor', 'posts', {
        update: (user, data) => user.id === data?.authorId,
      });

      const user = { id: '1', roles: ['editor'] };
      expect(Permit.check(user, 'posts', 'update', { authorId: '1' })).toBe(true);
      expect(Permit.check(user, 'posts', 'update', { authorId: '2' })).toBe(false);
    });

    it('denies function permissions when data is missing', () => {
      Permit.register('editor', 'posts', {
        update: (user, data) => user.id === data?.authorId,
      });

      const user = { id: '1', roles: ['editor'] };
      expect(Permit.check(user, 'posts', 'update')).toBe(false);
    });

    it('handles multiple roles', () => {
      Permit.register('admin', 'posts', { view: true });
      Permit.register('moderator', 'posts', { delete: true });

      const user = { id: '1', roles: ['admin', 'moderator'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'posts', 'delete')).toBe(true);
    });

    it('handles wildcard role permissions', () => {
      Permit.register('*', 'posts', { view: true });

      const user = { id: '1', roles: ['guest'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
    });

    it('handles wildcard resource permissions', () => {
      Permit.register('admin', '*', { view: true });

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
      expect(Permit.check(user, 'comments', 'view')).toBe(true);
    });

    it('prioritizes specific resource over wildcard', () => {
      Permit.register('admin', '*', { view: true });
      Permit.register('admin', 'posts', { view: false });

      const user = { id: '1', roles: ['admin'] };
      // Should use specific resource permission (false), not wildcard (true)
      expect(Permit.check(user, 'posts', 'view')).toBe(false);
      expect(Permit.check(user, 'comments', 'view')).toBe(true);
    });

    it('handles users with empty roles array', () => {
      Permit.register('*', 'posts', { view: true });

      const user = { id: '1', roles: [] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
    });

    it('handles false permissions explicitly set', () => {
      Permit.register('guest', 'posts', { delete: false });

      const user = { id: '1', roles: ['guest'] };
      expect(Permit.check(user, 'posts', 'delete')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all registered permissions', () => {
      Permit.register('admin', 'posts', { view: true });
      Permit.clear();

      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(false);
    });
  });

  describe('roles', () => {
    it('returns a copy of all roles', () => {
      Permit.register('admin', 'posts', { view: true });
      Permit.register('editor', 'comments', { create: true });

      const roles = Permit.roles;
      expect(roles.size).toBe(2);
      expect(roles.has('admin')).toBe(true);
      expect(roles.has('editor')).toBe(true);
    });

    it('returns defensive copy that does not affect internal state', () => {
      Permit.register('admin', 'posts', { view: true });

      const roles = Permit.roles;
      roles.clear();

      // Internal state should not be affected
      const user = { id: '1', roles: ['admin'] };
      expect(Permit.check(user, 'posts', 'view')).toBe(true);
    });
  });
});
