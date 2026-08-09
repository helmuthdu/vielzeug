import { table } from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';

import { createForm } from '../index';
import { loadForm, saveForm } from '../vault';

type Values = { email: string };
type Draft = { id: string; values: Values };

const schema = { drafts: table<Draft>('id') };
const codec = {
  fromRecord: (record: Draft) => (record.id === 'profile' ? record.values : undefined),
  toRecord: (values: Readonly<Values>): Draft => ({ id: 'profile', values }),
};

describe('Vault adapter', () => {
  test('saves explicit values and restores a clean baseline', async () => {
    const adapter = createMemory({ schema });
    const source = createForm<Values>({ initialValues: { email: '' } });

    source.field('email').set('ada@example.com');
    await saveForm(source, adapter, 'drafts', codec);

    const target = createForm<Values>({ initialValues: { email: '' } });

    target.field('email').touch();

    await expect(loadForm(target, adapter, 'drafts', 'profile', codec)).resolves.toBe(true);
    expect(target.value).toEqual({ email: 'ada@example.com' });
    expect(target.field('email').dirty).toBe(false);
    expect(target.field('email').touched).toBe(false);
  });

  test('does not mutate the form for missing or rejected drafts', async () => {
    const adapter = createMemory({ schema });
    const form = createForm<Values>({ initialValues: { email: '' } });

    await expect(loadForm(form, adapter, 'drafts', 'profile', codec)).resolves.toBe(false);
    expect(form.value).toEqual({ email: '' });

    await adapter.put('drafts', { id: 'other', values: { email: 'ignored@example.com' } });
    await expect(loadForm(form, adapter, 'drafts', 'other', codec)).resolves.toBe(false);
    expect(form.value).toEqual({ email: '' });
  });
});
