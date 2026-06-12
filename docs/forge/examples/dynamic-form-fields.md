---
title: 'Forge Examples — Dynamic Form Fields'
description: 'Dynamic Form Fields examples for forge.'
---

## Dynamic Form Fields

### Problem

Users can add or remove repeating entries — such as multiple phone numbers or project links. The number of fields is not known at form creation time, so fields must be added and removed dynamically.

### Solution

Store repeating entries as an array field and use `form.array()` for mutations:

```ts
import { createForm } from '@vielzeug/forge';

type TeamMember = { name: string; email: string; role: string };

const form = createForm({
  defaultValues: {
    teamName: '',
    members: [] as TeamMember[],
  },
  validators: {
    teamName: (v) => (!v ? 'Team name is required' : undefined),
  },
});

const members = form.array('members');

function addMember() {
  members.append({ name: '', email: '', role: 'member' });
}

function removeMember(index: number) {
  members.remove(index);
}

function moveMemberUp(index: number) {
  if (index > 0) members.move(index, index - 1);
}

async function submitTeam() {
  const result = await form.submit(async (values) => {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    return response.json();
  });

  if (!result.ok) return;
}
```

### Pitfalls

- Array items are stored as a whole array — `form.set('members', newArray)` or `form.array('members').remove(i)`. Do not register validators on array-item dot-path keys like `members.0.email`; register them on the parent key `members` instead.
- `members.remove(i)` shifts all subsequent indices — if you hold a cached validator or connection for index `i`, refresh it after removal.
- After `members.append(...)`, the new item's `touched` state is `false`. Validators still run on submit for all fields, including ones the user has never touched.

### Related

- [Form with Conditional Fields](./form-with-conditional-fields.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Multi-Step Wizard](./multi-step-wizard.md)
