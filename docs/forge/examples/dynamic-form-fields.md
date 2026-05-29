---
title: 'Forge Examples — Dynamic Form Fields'
description: 'Dynamic Form Fields examples for forge.'
---

## Dynamic Form Fields

### Problem

Users can add or remove repeating entries — such as multiple phone numbers or project links. The number of fields is not known at form creation time, so fields must be added and removed dynamically.

### Solution

Form with dynamically added/removed fields.

```typescript
import { createForm } from '@vielzeug/forge';

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
  const result = await dynamicForm.submit(async (values) => {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    return response.json();
  });

  if (!result.ok) {
    return;
  }
}
```


### Pitfalls

- Calling `removeField(name)` before reading the field value discards its data. Read the current value first if you need to process it before removal.
- Generating field names from array indices (`phone_0`, `phone_1`) causes stale validation state when items are reordered. Use stable IDs (e.g., UUIDs) as field keys instead.
- After `addField()`, the new field's `touched` state is `false`. Validators still run on submit for all fields, including ones the user has never touched — this is intentional but may show errors on fields the user has not seen yet.

### Related

- [Best Practices](./best-practices.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Form with Conditional Fields](./form-with-conditional-fields.md)
