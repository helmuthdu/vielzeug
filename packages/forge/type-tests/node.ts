import { createForm, type ReadonlyDeep } from '@vielzeug/forge';
import { bindField } from '@vielzeug/forge/dom';
import { toFormData } from '@vielzeug/forge/form-data';
import { loadForm, saveForm } from '@vielzeug/forge/persist';
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

void bindField;
void form;
void loadForm;
void mutableDateMethod;
void name;
void nestedReadonly;
void saveForm;
void schemaValidator;
void toFormData;
