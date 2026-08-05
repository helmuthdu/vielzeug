import type { AnySchema, KeyOf, RecordOf, VaultStore } from '@vielzeug/vault';

import type { Form, ReadonlyDeep } from './types';

export type FormDraftCodec<
  TValues extends Record<string, unknown>,
  S extends AnySchema,
  K extends keyof S & string,
> = Readonly<{
  fromRecord(record: RecordOf<S, K>): TValues | undefined;
  toRecord(values: ReadonlyDeep<TValues>): RecordOf<S, K>;
}>;

/** Explicit save/load avoids hidden autosave, migration, and persistence-policy side effects. */
export async function loadForm<
  TValues extends Record<string, unknown>,
  S extends AnySchema,
  K extends keyof S & string,
>(
  form: Form<TValues>,
  adapter: VaultStore<S>,
  table: K,
  key: KeyOf<S, K>,
  codec: FormDraftCodec<TValues, S, K>,
): Promise<boolean> {
  const record = await adapter.get(table, key);

  if (!record) return false;

  const values = codec.fromRecord(record);

  if (!values) return false;

  form.reset(values);

  return true;
}

export async function saveForm<
  TValues extends Record<string, unknown>,
  S extends AnySchema,
  K extends keyof S & string,
>(form: Form<TValues>, adapter: VaultStore<S>, table: K, codec: FormDraftCodec<TValues, S, K>): Promise<void> {
  await adapter.put(table, codec.toRecord(form.value));
}
