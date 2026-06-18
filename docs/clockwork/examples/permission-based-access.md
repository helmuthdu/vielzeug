---
title: Permission-Based Access Control
description: Use Ward RBAC with Clockwork to gate state transitions based on user permissions.
---

## Permission-Based Access Control

### Problem

Workflows with role-based access control need to:

- Prevent unauthorized state transitions
- Show different UI based on user permissions
- Guard state machine transitions with permission checks
- Log access attempts and denials

Hardcoding permission logic in the state machine makes it inflexible and hard to test with different role configurations.

### Solution

Use Ward as the source of truth for authorization, and call Ward predicates in Clockwork guards. The machine enforces the happy path, while Ward ensures users can only take allowed actions.

```ts
import { machine } from '@vielzeug/clockwork';
import { createRBAC } from '@vielzeug/ward';

type ApprovalEvent =
  | { type: 'SUBMIT'; data: Record<string, unknown> }
  | { type: 'REVIEW' }
  | { type: 'APPROVE' }
  | { type: 'REJECT'; reason: string }
  | { type: 'CANCEL' };

const rbac = createRBAC({
  roles: {
    submitter: ['submit', 'view'],
    reviewer: ['submit', 'view', 'review', 'approve', 'reject'],
    admin: ['submit', 'view', 'review', 'approve', 'reject', 'cancel'],
  },
});

const approvalMachine = machine({
  initial: 'draft',
  context: {
    userId: 'user123',
    userRole: 'submitter',
    submission: {} as Record<string, unknown>,
    reviewerNotes: '',
    denialReason: '',
  },
  states: {
    draft: {
      on: {
        SUBMIT: [
          {
            target: 'submitted',
            guard: canSubmit,
            actions: [recordSubmission],
          },
        ],
      },
    },
    submitted: {
      on: {
        REVIEW: [
          {
            target: 'reviewing',
            guard: canReview,
          },
        ],
        CANCEL: [
          {
            target: 'cancelled',
            guard: canCancel,
          },
        ],
      },
    },
    reviewing: {
      on: {
        APPROVE: [
          {
            target: 'approved',
            guard: canApprove,
            actions: [recordApproval],
          },
        ],
        REJECT: [
          {
            target: 'rejected',
            guard: canReject,
            actions: [recordRejection],
          },
        ],
      },
    },
    approved: { type: 'final' },
    rejected: {
      on: {
        SUBMIT: [
          {
            target: 'submitted',
            guard: canSubmit,
            actions: [recordSubmission],
          },
        ],
      },
    },
    cancelled: { type: 'final' },
  },
});

const canSubmit = ({ context }: any) => {
  return rbac.can(context.userRole, 'submit');
};

const canReview = ({ context }: any) => {
  return rbac.can(context.userRole, 'review');
};

const canApprove = ({ context }: any) => {
  return rbac.can(context.userRole, 'approve');
};

const canReject = ({ context }: any) => {
  return rbac.can(context.userRole, 'reject');
};

const canCancel = ({ context }: any) => {
  return (
    rbac.can(context.userRole, 'cancel') && (context.userRole === 'admin' || context.userId === context.submitterId)
  );
};

const recordSubmission = ({ context, event }: any) => {
  context.submission = event.data || {};
  context.denialReason = ''; // Clear previous rejection
};

const recordApproval = ({ context, event }: any) => {
  context.reviewerNotes = event.notes || '';
};

const recordRejection = ({ context, event }: any) => {
  context.denialReason = event.reason || '';
};

// Usage
const m = approvalMachine;

// Attempt to approve - succeeds if user has permission
m.send({ type: 'APPROVE' }); // OK if reviewer (context.userRole = 'reviewer')
// m.send({ type: 'APPROVE' }); // Blocked by guard if context.userRole = 'submitter'

export function submitForApproval(data: Record<string, unknown>) {
  m.send({ type: 'SUBMIT', data });
}

export function startReview() {
  m.send({ type: 'REVIEW' });
}

export function approveSubmission(notes: string) {
  m.send({ type: 'APPROVE', notes });
}

export function rejectSubmission(reason: string) {
  m.send({ type: 'REJECT', reason });
}

// Check what actions are allowed in current state
export function allowedActions(state: string): string[] {
  const role = machine.context.value.userRole;
  const actions: Record<string, string[]> = {
    draft: ['submit'],
    submitted: ['review', canCancel({ context: machine.context.value }) ? 'cancel' : ''],
    reviewing: ['approve', 'reject'],
  };
  return (actions[state] || []).filter(Boolean);
}
```

### Pitfalls

1. **Guard failures silently block transitions** - When a permission check fails, the machine stays in the current state with no error thrown. Users may not realize their action was denied. Emit a denied event or error for UI feedback.

2. **Mixing RBAC and business logic guards** - Keep authorization separate from validation logic. Use dedicated guard functions for each concern (canApprove vs validateApprovalForm).

3. **Role changes mid-workflow** - If user role changes (e.g., admin promotes to reviewer), the machine doesn't know. Pass role as part of events or use effect() to sync role changes to machine.

4. **No audit trail** - Permission checks happen silently. Add logging to record who tried what action and whether it succeeded. Use debug hooks: `{ debug: { onTransition: (info) => log(info) } }`.

### Related

- [Ward](../ward/) - RBAC engine with wildcards and predicates
- [Ripple](../ripple/) - Reactive signals for user role synchronization
- [Rune](../rune/) - Structured logging for audit trails
- [Form with Validation](./form-validation.md) - Combining validation with permissions
