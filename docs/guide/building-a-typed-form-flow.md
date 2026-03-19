---
title: Building a Typed Form Flow
description: Compose Validit, Formit, and Fetchit for a complete, typed form submission pipeline.
---

# Building a Typed Form Flow

This guide combines `@vielzeug/validit`, `@vielzeug/formit`, and `@vielzeug/fetchit` to build a typed form flow from user input to API submission.
A validation schema is one reusable rule set for parsing and checking incoming data.

## Problem

You need one schema definition that powers UI validation, submit payload typing, and server request handling.

## Architecture

| Step       | Package             | Responsibility                                      |
| ---------- | ------------------- | --------------------------------------------------- |
| Schema     | `@vielzeug/validit` | Define validation schema and parse unknown input    |
| Form state | `@vielzeug/formit`  | Manage field values, touched state, and submit flow |
| Transport  | `@vielzeug/fetchit` | Send validated payloads to an API endpoint          |

## Runnable Example

```ts
import { createApi } from '@vielzeug/fetchit';
import { createForm } from '@vielzeug/formit';
import { v, type Infer } from '@vielzeug/validit';

const UserSchema = v.object({
  email: v.string().trim().email(),
  name: v.string().min(2),
  age: v.coerce.number().int().min(18),
});

type UserInput = Infer<typeof UserSchema>;

const api = createApi({ baseUrl: '/api' });

const form = createForm<UserInput>({
  defaultValues: { email: '', name: '', age: 18 },
  validators: {
    email: (value) => {
      const result = v.string().trim().email().safeParse(value);
      return result.success ? undefined : result.error.message;
    },
    name: (value) => {
      const result = v.string().min(2).safeParse(value);
      return result.success ? undefined : result.error.message;
    },
    age: (value) => {
      const result = v.coerce.number().int().min(18).safeParse(value);
      return result.success ? undefined : result.error.message;
    },
  },
});

export async function submitRegistration(rawInput: unknown): Promise<void> {
  const parsed = UserSchema.safeParse(rawInput);
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    console.error('Validation failed', fieldErrors);
    return;
  }

  await form.submit(async () => {
    await api.post('/users', { body: parsed.data });
  });
}
```

## Expected Output

- Invalid payloads fail fast with field-level errors.
- Valid payloads are submitted with a typed request body.
- Form submission status stays in sync with async request state.

## Common Pitfalls

- Defining one schema for UI and a different schema for submit payloads.
- Casting unknown values instead of parsing them with `safeParse`.
- Sending raw form strings without coercion for numeric fields.

## See Also

- [Validit](../validit/)
- [Formit](../formit/)
- [Fetchit](../fetchit/)
- [State and Routing](./state-and-routing)
