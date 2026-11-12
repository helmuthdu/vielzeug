import { table } from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';
import { vi } from 'vitest';

import { createForm } from '../index';
import { type FormDraftStore, loadForm, saveForm } from '../persist';

describe('form persistence', () => {
  it('saves and restores drafts through a key/value store', async () => {
    const drafts = new Map<string, unknown>();
    const store: FormDraftStore = {
      get: async (key) => drafts.get(key),
      put: async (key, value) => {
        drafts.set(key, value);
      },
    };
    const form = createForm({ initialValues: { name: 'Ada' } });

    await saveForm(form, store, 'profile');
    form.set({ name: 'Grace' });

    await expect(loadForm(form, store, 'profile')).resolves.toBe(true);
    expect(form.value.name).toBe('Ada');
  });

  it('integrates with a typed Vault store through a small adapter', async () => {
    type Values = { email: string };
    const raw = createMemory({ schema: { drafts: table<{ id: string; values: Values }>('id') } });
    const store: FormDraftStore = {
      get: async (key) => (await raw.get('drafts', key))?.values,
      put: async (key, value) => {
        await raw.put('drafts', { id: key, values: value as Values });
      },
    };
    const source = createForm<Values>({ initialValues: { email: 'ada@example.com' } });
    const target = createForm<Values>({ initialValues: { email: '' } });

    await saveForm(source, store, 'profile');

    await expect(loadForm(target, store, 'profile')).resolves.toBe(true);
    expect(target.value.email).toBe('ada@example.com');
  });

  it('reports unusable drafts as missing', async () => {
    const store: FormDraftStore = { get: async () => 'not an object', put: async () => undefined };
    const form = createForm({ initialValues: { name: 'Ada' } });

    await expect(loadForm(form, store, 'profile')).resolves.toBe(false);
    expect(form.value.name).toBe('Ada');
  });

  it('does not overwrite edits made while a draft is loading', async () => {
    let resolve!: (value: { name: string }) => void;
    const store: FormDraftStore = {
      get: () => new Promise((done) => (resolve = done)),
      put: async () => undefined,
    };
    const form = createForm({ initialValues: { name: 'Ada' } });
    const loading = loadForm(form, store, 'profile');

    form.field('name').set('Grace');
    resolve({ name: 'Loaded' });

    await expect(loading).resolves.toBe(false);
    expect(form.value.name).toBe('Grace');
  });

  it('does not start persistence with an already-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const get = vi.fn(async () => undefined);
    const put = vi.fn(async () => undefined);
    const form = createForm({ initialValues: { name: 'Ada' } });

    await expect(loadForm(form, { get, put }, 'profile', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    await expect(saveForm(form, { get, put }, 'profile', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(get).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it('cancels draft loading with its owner', async () => {
    const store: FormDraftStore = { get: () => new Promise<never>(() => undefined), put: async () => undefined };
    const form = createForm({ initialValues: { name: 'Ada' } });
    const loading = loadForm(form, store, 'profile');

    form.dispose();

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
  });
});
