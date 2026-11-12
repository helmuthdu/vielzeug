import { createForm, type ReadonlyDeep } from '@vielzeug/forge';
import { bindField } from '@vielzeug/forge/dom';
import { toFormData } from '@vielzeug/forge/form-data';
import { type FormDraftStore, loadForm, saveForm } from '@vielzeug/forge/persist';
import { schemaValidator } from '@vielzeug/forge/schema';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type IsReadonly<T, K extends keyof T> = Equal<Pick<T, K>, Readonly<Pick<T, K>>>;
type Values = ReadonlyDeep<{ dueAt: Date; profile: { name: string } }>;
type NestedReadonly = IsReadonly<Values['profile'], 'name'>;
type MutableDateMethod = 'setFullYear' extends keyof Values['dueAt'] ? true : false;

const nestedReadonly: NestedReadonly = true;
const mutableDateMethod: MutableDateMethod = false;
const form = createForm({ initialValues: { profile: { name: 'Ada' } } });
const name: string = form.value.profile.name;

const patchForm = createForm<{ count: number; name: string }>({ initialValues: { count: 1, name: 'Ada' } });
patchForm.patch({ count: 1 });
patchForm.patch((previous) => ({ name: previous.name.toUpperCase() }));
// @ts-expect-error patch keys must exist on TValues
patchForm.patch({ nope: 1 });

const draftStore: FormDraftStore = {
  get: (key) => ({ key, name: 'Ada' }),
  put: (key, value) => {
    const name: unknown = value.name;
    void name;
    void key;
  },
};
void loadForm(form, draftStore, 'profile', { signal: new AbortController().signal });
void saveForm(form, draftStore, 'profile');

const rejectedDraft = loadForm(form, draftStore, 'profile');
void rejectedDraft;

void bindField;
void form;
void loadForm;
void mutableDateMethod;
void name;
void nestedReadonly;
void patchForm;
void saveForm;
void schemaValidator;
void toFormData;
