import { interpolate } from '../interpolate';

describe('interpolate', () => {
  test('interpolates plain and nested tokens', () => {
    const result = interpolate('Hello {name}, {user.profile.name}!', {
      name: 'World',
      user: { profile: { name: 'Alice' } },
    });

    expect(result).toBe('Hello World, Alice!');
  });

  test('replaces null/undefined/missing tokens with empty string', () => {
    const result = interpolate('{a}-{b}-{c}', { a: null, b: undefined });

    expect(result).toBe('--');
  });

  test('supports unicode variable names', () => {
    const result = interpolate('Bonjour {prénom}, {名前}!', { prénom: 'Marie', 名前: '田中' });

    expect(result).toBe('Bonjour Marie, 田中!');
  });
});
