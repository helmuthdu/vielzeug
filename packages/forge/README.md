# @vielzeug/forge

> Immutable typed form state with focused fields and explicit full-form validation.

## Quick Start

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({
  initialValues: { profile: { email: '', name: '' } },
  validate: (value) => ({
    fields: { profile: { email: value.profile.email.includes('@') ? undefined : 'Enter a valid email' } },
  }),
});

const email = form.field('profile').field('email');
email.set('ada@example.com');

const result = await form.submit((value) => saveProfile(value));
```

`Form` owns one immutable value tree of primitives, plain objects, arrays, `Date`, `File`, and `Blob`. Object fields select child branches and array items support per-index field handles. One validator evaluates the whole form and returns `{ fields, formError }`.

## Optional adapters

- `@vielzeug/forge/dom` — explicit element binding; application owns validation timing.
- `@vielzeug/forge/form-data` — `toFormData()` serializes nested values into `FormData`.
- `@vielzeug/forge/spell` — typed `customValidator(schema)` adapter with per-union diagnostics.
- `@vielzeug/forge/vault` — explicit `saveForm()` and `loadForm()` draft helpers.

## Documentation

- [Overview](https://vielzeug.dev/forge/)
- [Usage guide](https://vielzeug.dev/forge/usage)
- [API reference](https://vielzeug.dev/forge/api)
- [Examples](https://vielzeug.dev/forge/examples)

## License

MIT © Helmuth Saatkamp — part of the Vielzeug monorepo.
