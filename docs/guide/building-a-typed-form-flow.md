---
title: Building a Typed Form Flow
description: Compose Spell, Forge, and Courier for a complete, typed form submission pipeline.
---

# Building a Typed Form Flow

This guide combines `@vielzeug/spell`, `@vielzeug/forge`, and `@vielzeug/courier` to build a typed form flow from user input to API submission.
A validation schema is one reusable rule set for parsing and checking incoming data.

## Problem

You need one schema definition that powers UI validation, submit payload typing, and server request handling.

## Architecture

| Step       | Package             | Responsibility                                      |
| ---------- | ------------------- | --------------------------------------------------- |
| Schema     | `@vielzeug/spell` | Define validation schema and infer submit payload types |
| Form state | `@vielzeug/forge`  | Manage field values, touched state, and submit flow |
| Transport  | `@vielzeug/courier` | Send validated payloads to an API endpoint          |

## Runnable Example

```ts
import { createApi } from '@vielzeug/courier';
import { createForm, schemaValidator } from '@vielzeug/forge';
import { s, type Infer } from '@vielzeug/spell';

// One schema drives both field validation and the submit payload type.
const UserSchema = s.object({
  email: s.string().trim().email(),
  name: s.string().min(2),
  age: s.coerce.number().int().min(18),
});

type UserInput = Infer<typeof UserSchema>;

const api = createApi({ baseUrl: '/api' });

const form = createForm<UserInput>({
  defaultValues: { email: '', name: '', age: 18 },
  validator: schemaValidator(UserSchema),
});

// form.submit() runs the schema validator before calling the handler.
// If validation fails, the handler is skipped and field errors are set.
await form.submit(async (values) => {
  await api.post('/users', { body: values });
});
```

## Expected Output

- Invalid payloads fail fast with field-level errors.
- Valid payloads are submitted with a typed request body.
- Form submission status stays in sync with async request state.

## Common Pitfalls

- Defining separate schemas for UI validation and the submit payload — use one schema and `schemaValidator` for both.
- Duplicating the same field rule in both `validators` and `validator` — that can produce duplicate checks or mixed error messages on submit.
- Sending raw form strings without coercion for numeric fields — use `s.coerce.number()` in the schema rather than casting in the handler.

## See Also

- [Spell](../spell/)
- [Forge](../forge/)
- [Courier](../courier/)
- [State and Routing](./state-and-routing)
