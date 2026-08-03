import { bench, describe } from 'vitest';

import { createForm } from '../../index';

type Values = {
  profile: { email: string; name: string };
  tags: string[];
};

describe('immutable form updates', () => {
  const form = createForm<Values>({
    initialValues: { profile: { email: '', name: '' }, tags: [] },
    validate: (value) => ({ fields: { profile: { email: value.profile.email ? undefined : 'Required' } } }),
  });

  bench('nested field replacement', () => {
    form.field('profile').field('email').set('ada@example.com');
  });

  bench('array updater', () => {
    form.field('tags').set((tags) => [...tags, 'forge']);
  });

  bench('full validation', async () => {
    await form.validate();
  });
});
