import { describe, expect, it } from 'vitest';

import { buildUrl } from '../url';

describe('buildUrl', () => {
  describe('base URL and path combination', () => {
    it('combines base URL and path correctly', () => {
      expect(buildUrl('https://api.example.com', '/users')).toBe('https://api.example.com/users');
    });

    it('strips trailing slash from base and leading slash from path', () => {
      expect(buildUrl('https://api.example.com/', '/users')).toBe('https://api.example.com/users');
    });

    it('returns base URL when path is empty', () => {
      expect(buildUrl('https://api.example.com', '')).toBe('https://api.example.com');
    });

    it('returns path when base is empty', () => {
      expect(buildUrl('', '/users')).toBe('users');
    });

    it('returns empty string when both are empty', () => {
      expect(buildUrl('', '')).toBe('');
    });
  });

  describe('path param interpolation', () => {
    it('interpolates a single {param} placeholder', () => {
      expect(buildUrl('https://api.example.com', '/users/{id}', { id: 42 })).toBe('https://api.example.com/users/42');
    });

    it('interpolates multiple placeholders', () => {
      expect(buildUrl('https://api.example.com', '/users/{userId}/posts/{postId}', { postId: 99, userId: 1 })).toBe(
        'https://api.example.com/users/1/posts/99',
      );
    });

    it('URL-encodes special characters in params', () => {
      expect(buildUrl('', '/search/{q}', { q: 'hello world' })).toBe('search/hello%20world');
    });

    it('throws when a required param is undefined', () => {
      expect(() => buildUrl('', '/users/{id}', {})).toThrow(/unresolved path param \{id\}/);
    });

    it('throws when a required param is null', () => {
      expect(() => buildUrl('', '/users/{id}', { id: null as unknown as string })).toThrow(
        /unresolved path param \{id\}/,
      );
    });

    it('accepts boolean and number param values', () => {
      expect(buildUrl('', '/path/{flag}/{count}', { count: 5, flag: true })).toBe('path/true/5');
    });
  });

  describe('query string building', () => {
    it('appends a simple query param', () => {
      expect(buildUrl('https://api.example.com', '/users', undefined, { page: 1 })).toBe(
        'https://api.example.com/users?page=1',
      );
    });

    it('omits params with undefined values', () => {
      expect(buildUrl('', '/users', undefined, { page: 1, search: undefined })).toBe('users?page=1');
    });

    it('encodes null query values as empty string', () => {
      expect(buildUrl('', '/users', undefined, { search: null })).toBe('users?search=');
    });

    it('appends array values as repeated params', () => {
      expect(buildUrl('', '/users', undefined, { ids: [1, 2, 3] })).toBe('users?ids=1&ids=2&ids=3');
    });

    it('skips undefined entries within array values', () => {
      expect(buildUrl('', '/path', undefined, { ids: [1, undefined, 3] as unknown as number[] })).toBe(
        'path?ids=1&ids=3',
      );
    });

    it('uses & when URL already contains ?', () => {
      expect(buildUrl('', '/search?q=test', undefined, { page: 2 })).toBe('search?q=test&page=2');
    });

    it('returns URL without ? when query object is empty', () => {
      expect(buildUrl('', '/users', undefined, {})).toBe('users');
    });

    it('returns URL without ? when all query values are undefined', () => {
      expect(buildUrl('', '/users', undefined, { x: undefined, y: undefined })).toBe('users');
    });
  });
});
