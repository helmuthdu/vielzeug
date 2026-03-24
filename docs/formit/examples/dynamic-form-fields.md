---
title: 'Formit Examples — Dynamic Form Fields'
description: 'Dynamic Form Fields examples for formit.'
---

## Dynamic Form Fields

## Problem

Implement dynamic form fields in a production-friendly way with `@vielzeug/formit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/formit` installed.

Form with dynamically added/removed fields.

```typescript
import { createForm } from '@vielzeug/formit';

type TeamMember = {
  name: string;
  email: string;
  role: string;
};

const dynamicForm = createForm({
  defaultValues: {
    teamName: '',
    members: [] as TeamMember[],
  },
  validators: {
    teamName: (v) => (!v ? 'Team name is required' : undefined),
  },
});

// Add a team member
function addMember() {
  const members = dynamicForm.get<TeamMember[]>('members') ?? [];
  dynamicForm.set('members', [...members, { name: '', email: '', role: 'member' }]);
}

// Remove a team member
function removeMember(index: number) {
  const members = dynamicForm.get<TeamMember[]>('members') ?? [];
  dynamicForm.set(
    'members',
    members.filter((_, i) => i !== index),
  );
}

// Update a team member
function updateMember(index: number, field: keyof TeamMember, value: string) {
  const members = dynamicForm.get<TeamMember[]>('members') ?? [];
  const updated = [...members];
  updated[index] = { ...updated[index], [field]: value };
  dynamicForm.set('members', updated);
}

// Submit
async function submitTeam() {
  await dynamicForm.submit(async (values) => {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
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
- [Form with Conditional Fields](./form-with-conditional-fields.md)
