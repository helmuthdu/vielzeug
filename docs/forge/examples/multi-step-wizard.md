---
title: 'Forge Examples — Multi-Step Wizard'
description: Build wizard screens from focused fields and application-owned navigation.
---

## Multi-Step Wizard

### Problem

A wizard needs nested values shared across screens without creating a second scoped form controller. Each screen must decide when to validate and how to present errors.

### Solution

Select the current object branch with a field handle, but validate the complete form before advancing.

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({
  initialValues: { address: { city: '', street: '' }, personal: { email: '', name: '' } },
  validate: (value) => ({
    fields: {
      address: { city: value.address.city ? undefined : 'City is required', street: value.address.street ? undefined : 'Street is required' },
      personal: { email: value.personal.email.includes('@') ? undefined : 'Enter a valid email', name: value.personal.name ? undefined : 'Name is required' },
    },
  }),
});

const personal = form.field('personal');
personal.field('name').set('Ada');

async function advance() {
  const result = await form.validate();

  if (result.status !== 'valid') return false;

  return true;
}

console.log(await advance());
```

### Pitfalls

- Field handles select data branches; they do not create independently valid sub-forms.
- Keep step navigation and error filtering in application UI code.
- Call full validation before final submission even if earlier screens were validated.

### Related

- [Conditional Values](./form-with-conditional-fields.md)
- [Wayfinder](/wayfinder/)
- [Spell](/spell/)
