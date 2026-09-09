import { abortable, abortError } from '@vielzeug/arsenal';

import type { Form } from './types.js';

export type FormDraftCodec<TValues extends Record<string, unknown>, RecordValue> = Readonly<{
  fromRecord(record: RecordValue): TValues | undefined;
  toRecord(values: Form<TValues>['value']): RecordValue;
}>;

export type FormDraftStore<Table extends string, Key, RecordValue> = {
  get(table: Table, key: Key): Promise<RecordValue | undefined>;
  put(table: Table, value: RecordValue): Promise<void>;
};

export type FormPersistenceOptions = Readonly<{ signal?: AbortSignal }>;

export type FormDraftWriteStore<Table extends string, RecordValue> = {
  put(table: Table, value: RecordValue): Promise<void>;
};

export async function loadForm<TValues extends Record<string, unknown>, Table extends string, Key, RecordValue>(
  form: Form<TValues>,
  store: FormDraftStore<Table, Key, RecordValue>,
  table: Table,
  key: Key,
  codec: FormDraftCodec<TValues, RecordValue>,
  options: FormPersistenceOptions = {},
): Promise<boolean> {
  const signal = options.signal ? AbortSignal.any([form.disposalSignal, options.signal]) : form.disposalSignal;
  if (signal.aborted) throw abortError(signal);
  const snapshot = form.value;
  const record = await abortable(store.get(table, key), signal);
  if (record === undefined || form.value !== snapshot) return false;

  const values = codec.fromRecord(record);
  if (values === undefined || form.value !== snapshot) return false;

  form.reset(values);
  return true;
}

export async function saveForm<TValues extends Record<string, unknown>, Table extends string, RecordValue>(
  form: Form<TValues>,
  store: FormDraftWriteStore<Table, RecordValue>,
  table: Table,
  codec: FormDraftCodec<TValues, RecordValue>,
  options: FormPersistenceOptions = {},
): Promise<void> {
  const signal = options.signal ? AbortSignal.any([form.disposalSignal, options.signal]) : form.disposalSignal;
  if (signal.aborted) throw abortError(signal);
  await abortable(store.put(table, codec.toRecord(form.value)), signal);
}
