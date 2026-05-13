---
title: 'Formit Examples — Form with Conditional Fields'
description: 'Form with Conditional Fields examples for formit.'
---

## Form with Conditional Fields

### Problem

Some fields should only appear when another field has a specific value — for example, a "Company name" field that is hidden unless the user selects "Business account". Hidden fields must not contribute to validation.

### Solution

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
    email: (v) => {
      if (!v) return 'Email is required';
      if (!String(v).includes('@')) return 'Invalid email';
    },
  },
});

// Conditional validation based on account type
profileForm.subscribe(() => {
  const accountType = profileForm.get('accountType');

  if (accountType === 'business') {
    if (!profileForm.get('companyName')) {
      profileForm.setError('companyName', 'Company name is required');
    } else {
      profileForm.clearError('companyName');
    }
    if (!profileForm.get('vatNumber')) {
      profileForm.setError('vatNumber', 'VAT number is required');
    } else {
      profileForm.clearError('vatNumber');
    }
    const businessEmail = profileForm.get('businessEmail');
    if (!businessEmail) {
      profileForm.setError('businessEmail', 'Business email is required');
    } else if (!businessEmail.includes('@')) {
      profileForm.setError('businessEmail', 'Invalid email');
    } else {
      profileForm.clearError('businessEmail');
    }
  } else {
    profileForm.clearError('companyName');
    profileForm.clearError('vatNumber');
    profileForm.clearError('businessEmail');
  }
});

// Submit
async function submitProfile() {
  const result = await profileForm.submit(async (values) => {
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

  if (!result.ok) {
    return;
  }
}
```

### Pitfalls

- A hidden field's value is still included in `form.values` and submitted unless you call `removeField(name)`. Hide the UI element but also remove the field if it should not be submitted.
- Validators on conditional fields still run even when the field is hidden if you did not remove it. This can surface validation errors that the user cannot see or act on.
- Setting up a `subscribeField` listener for a field that does not yet exist is a no-op. Register subscriptions after `addField()`, not before.

### Related

- [Best Practices](./best-practices.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Dynamic Form Fields](./dynamic-form-fields.md)
