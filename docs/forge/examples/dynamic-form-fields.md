---
title: 'Forge Examples — Dynamic Form Fields'
description: Update repeating form values through immutable array replacement.
---

## Dynamic Form Fields

### Problem

A team form needs to add and remove members while keeping one immutable form value. Array item positions must not become long-lived field identities because reordering changes their meaning.

### Solution

Store the collection in one array field and replace it with updater functions.

```ts
import { createForm } from '@vielzeug/forge';

type Member = { email: string; name: string };

const form = createForm({
  initialValues: { members: [] as Member[], teamName: '' },
  validate: (value) => ({ fields: { teamName: value.teamName ? undefined : 'Team name is required' } }),
});

const members = form.field('members');

function addMember() {
  members.set((previous) => [...previous, { email: '', name: '' }]);
}

function removeMember(index: number) {
  members.set((previous) => previous.filter((_, current) => current !== index));
}

addMember();
console.log(form.value.members);
```

### Pitfalls

- Do not retain array-index field handles; Forge intentionally does not expose them.
- Use stable item IDs in rendering code when rows can reorder.
- Validate member contents in the full-form validator when the collection is submitted.

### Related

- [Conditional Values](./form-with-conditional-fields.md)
- [Multi-Step Wizard](./multi-step-wizard.md)
- [Dnd](/dnd/)
