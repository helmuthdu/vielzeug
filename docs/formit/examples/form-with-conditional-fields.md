---
title: 'Formit Examples — Form with Conditional Fields'
description: 'Form with Conditional Fields examples for formit.'
---

## Form with Conditional Fields

## Problem

Implement form with conditional fields in a production-friendly way with `@vielzeug/formit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/formit` installed.

Form with fields that show/hide based on other field values.

```typescript
import { createForm } from '@vielzeug/formit';

const profileForm = createForm({
  defaultValues: {
    accountType: 'personal' as 'personal' | 'business',
    name: '',
    email: '',
    // Business-only fields
    companyName: '',
    vatNumber: '',
    businessEmail: '',
  },
  validators: {
    name: (v) => (!v ? 'Name is required' : undefined),
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    ],
  },
});

// Conditional validation based on account type
profileForm.subscribe(() => {
  const accountType = profileForm.get<string>('accountType');

  if (accountType === 'business') {
    if (!profileForm.get('companyName')) {
      profileForm.setError('companyName', 'Company name is required');
    } else {
      profileForm.setError('companyName');
    }
    if (!profileForm.get('vatNumber')) {
      profileForm.setError('vatNumber', 'VAT number is required');
    } else {
      profileForm.setError('vatNumber');
    }
    const businessEmail = profileForm.get<string>('businessEmail');
    if (!businessEmail) {
      profileForm.setError('businessEmail', 'Business email is required');
    } else if (!businessEmail.includes('@')) {
      profileForm.setError('businessEmail', 'Invalid email');
    } else {
      profileForm.setError('businessEmail');
    }
  } else {
    profileForm.setError('companyName');
    profileForm.setError('vatNumber');
    profileForm.setError('businessEmail');
  }
});

// Submit
async function submitProfile() {
  await profileForm.submit(async (values) => {
    const payload: Record<string, unknown> = {
      accountType: values['accountType'],
      name: values['name'],
      email: values['email'],
    };

    if (values['accountType'] === 'business') {
      payload['companyName'] = values['companyName'];
      payload['vatNumber'] = values['vatNumber'];
      payload['businessEmail'] = values['businessEmail'];
    }

    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.json();
  });
}
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Best Practices](./best-practices.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Dynamic Form Fields](./dynamic-form-fields.md)
