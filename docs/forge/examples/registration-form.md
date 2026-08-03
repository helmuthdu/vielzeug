---
title: 'Forge Examples — Registration Form'
description: Perform cross-field and asynchronous validation in one validator.
---

## Registration Form

### Problem

Registration needs password confirmation plus an asynchronous username check. A newer validation must make older validation results irrelevant.

### Solution

Read all related values in one asynchronous validator and pass Forge's signal to remote work.

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({
  initialValues: { email: '', password: '', passwordConfirmation: '', username: '' },
  validate: async (value, signal) => {
    const usernameTaken = value.username
      ? await fetch(`/api/users/${encodeURIComponent(value.username)}`, { signal }).then((response) => response.ok)
      : false;

    return {
      fields: {
        email: value.email.includes('@') ? undefined : 'Enter a valid email',
        password: value.password.length >= 8 ? undefined : 'Use at least eight characters',
        passwordConfirmation: value.password === value.passwordConfirmation ? undefined : 'Passwords must match',
        username: usernameTaken ? 'Username is already taken' : undefined,
      },
    };
  },
});

form.field('username').set('ada');
console.log(await form.validate());
```

### Pitfalls

- Pass `signal` to every abortable remote request.
- Treat an `aborted` validation result as neither valid nor invalid.
- Validate the full value after changing password or password confirmation.

### Related

- [Login Form](./login-form.md)
- [Spell](/spell/)
- [Courier](/courier/)
