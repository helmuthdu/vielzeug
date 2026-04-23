import { resolvePath } from '../helpers';

describe('helpers — resolvePath', () => {
  test('resolves direct keys and dot paths', () => {
    const data = {
      plain: 'ok',
      user: { profile: { name: 'Alice' } },
    };

    expect(resolvePath(data, 'plain')).toBe('ok');
    expect(resolvePath(data, 'user.profile.name')).toBe('Alice');
  });

  test('returns undefined for missing segments', () => {
    const data = { user: { profile: { name: 'Alice' } } };

    expect(resolvePath(data, 'user.missing.name')).toBeUndefined();
    expect(resolvePath(data, 'missing')).toBeUndefined();
  });
});
