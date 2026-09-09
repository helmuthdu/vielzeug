import { table } from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';
import { vi } from 'vitest';

import { createForm } from '../index';
import { loadForm, saveForm } from '../persist';

describe('form persistence', () => {
  it('saves and restores through a structural store contract', async () => {
    type Draft = { id: string; name: string };
    let draft: Draft | undefined;
    const store = {
      get: async (_table: 'drafts', _key: string) => draft,
      put: async (_table: 'drafts', value: Draft) => {
        draft = value;
      },
    };
    const codec = {
      fromRecord: (record: Draft) => ({ name: record.name }),
      toRecord: (values: Readonly<{ name: string }>) => ({ id: 'profile', name: values.name }),
    };
    const form = createForm({ initialValues: { name: 'Ada' } });

    await saveForm(form, store, 'drafts', codec);
    form.set({ name: 'Grace' });
    await expect(loadForm(form, store, 'drafts', 'profile', codec)).resolves.toBe(true);
    expect(form.value.name).toBe('Ada');
  });

  it('integrates with a typed Vault store', async () => {
    type Values = { email: string };
    type Draft = { id: string; values: Values };
    const rawStore = createMemory({ schema: { drafts: table<Draft>('id') } });
    const store = {
      get: (table: 'drafts', key: string) => rawStore.get(table, key),
      put: async (table: 'drafts', value: Draft) => {
        await rawStore.put(table, value);
      },
    };
    const codec = {
      fromRecord: (record: Draft) => record.values,
      toRecord: (values: Readonly<Values>): Draft => ({ id: 'profile', values }),
    };
    const source = createForm<Values>({ initialValues: { email: 'ada@example.com' } });
    const target = createForm<Values>({ initialValues: { email: '' } });

    await saveForm(source, store, 'drafts', codec);
    await expect(loadForm(target, store, 'drafts', 'profile', codec)).resolves.toBe(true);
    expect(target.value.email).toBe('ada@example.com');
  });

  it('does not overwrite edits made while a draft is loading', async () => {
    let resolve!: (value: { id: string; name: string }) => void;
    const store = {
      get: () => new Promise<{ id: string; name: string }>((done) => (resolve = done)),
      put: async () => undefined,
    };
    const form = createForm({ initialValues: { name: 'Ada' } });
    const codec = {
      fromRecord: (record: { id: string; name: string }) => ({ name: record.name }),
      toRecord: (values: Readonly<{ name: string }>) => ({ id: 'profile', name: values.name }),
    };
    const loading = loadForm(form, store, 'drafts', 'profile', codec);

    form.field('name').set('Grace');
    resolve({ id: 'profile', name: 'Loaded' });

    await expect(loading).resolves.toBe(false);
    expect(form.value.name).toBe('Grace');
  });

  it('does not start persistence with an already-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const get = vi.fn(async () => undefined);
    const put = vi.fn(async () => undefined);
    const form = createForm({ initialValues: { name: 'Ada' } });
    const codec = {
      fromRecord: (record: { name: string }) => record,
      toRecord: (values: Readonly<{ name: string }>) => values,
    };

    await expect(
      loadForm(form, { get, put }, 'drafts', 'profile', codec, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(saveForm(form, { put }, 'drafts', codec, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(get).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it('cancels draft loading with its owner', async () => {
    const store = {
      get: () => new Promise<never>(() => undefined),
      put: async () => undefined,
    };
    const form = createForm({ initialValues: { name: 'Ada' } });
    const codec = {
      fromRecord: (record: { name: string }) => record,
      toRecord: (values: Readonly<{ name: string }>) => values,
    };
    const loading = loadForm(form, store, 'drafts', 'profile', codec);

    form.dispose();

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
  });
});
