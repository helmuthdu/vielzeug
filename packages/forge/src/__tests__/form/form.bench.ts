import { describe, test } from 'vitest';

import { createForm } from '../../index';

type Values = {
  profile: { email: string; name: string };
  tags: string[];
};

describe('immutable form updates', () => {
  const form = createForm<Values>({
    initialValues: { profile: { email: '', name: '' }, tags: [] },
    validate: (value) => (value.profile.email ? undefined : [{ message: 'Required', path: ['profile', 'email'] }]),
  });

  test('benchmarks', async ({ bench }) => {
    await bench.compare(
      bench('nested field replacement', () => {
        form.field('profile').field('email').set('ada@example.com');
      }),
      bench('array updater', () => {
        form.field('tags').set((tags) => [...tags, 'forge']);
      }),
      bench('full validation', async () => {
        await form.validate();
      }),
    );
  });
});
