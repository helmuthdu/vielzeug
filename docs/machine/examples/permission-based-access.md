---
title: Permission-Based Access Control
description: Use Permit RBAC with Machine to gate state transitions based on user permissions.
---

## Problem

Workflows with role-based access control need to:
- Prevent unauthorized state transitions
- Show different UI based on user permissions
- Guard state machine transitions with permission checks
- Log access attempts and denials

Hardcoding permission logic in the machine makes it inflexible and hard to test with different role configurations.

## Solution

Use Permit as the source of truth for authorization, and call permit predicates in Machine guards. The machine enforces the happy path, while permit ensures users can only take allowed actions.

```ts
import { defineMachine, interpret, assign, MachinitError } from '@vielzeug/machine';
import { createRBAC } from '@vielzeug/permit';

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

const approvalMachine = defineMachine({
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
  return rbac.can(context.userRole, 'cancel') &&
    (context.userRole === 'admin' || context.userId === context.submitterId);
};

const recordSubmission = assign(({ event }) => ({
  submission: (event as any).data || {},
  denialReason: '', // Clear previous rejection
}));

const recordApproval = assign(({ event }) => ({
  reviewerNotes: (event as any).notes || '',
}));

const recordRejection = assign(({ event }) => ({
  denialReason: (event as any).reason || '',
}));

// Usage
const machine = interpret(approvalMachine, {
  context: {
    userId: 'user123',
    userRole: 'reviewer', // This role can review and approve
    submission: {},
    reviewerNotes: '',
    denialReason: '',
  },
});

// Attempt to approve - succeeds if user has permission
machine.send({ type: 'APPROVE' }); // OK if reviewer
// machine.send({ type: 'APPROVE' }); // Fails silently if submitter

export function submitForApproval(data: Record<string, unknown>) {
  machine.send({ type: 'SUBMIT', data });
}

export function startReview() {
  machine.send({ type: 'REVIEW' });
}

export function approveSubmission(notes: string) {
  machine.send({ type: 'APPROVE', notes });
}

export function rejectSubmission(reason: string) {
  machine.send({ type: 'REJECT', reason });
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

## Pitfalls

1. **Guard failures silently block transitions** - When a permission check fails, the machine stays in the current state with no error thrown. Users may not realize their action was denied. Emit a denied event or error for UI feedback.

2. **Mixing RBAC and business logic guards** - Keep authorization separate from validation logic. Use dedicated guard functions for each concern (canApprove vs validateApprovalForm).

3. **Role changes mid-workflow** - If user role changes (e.g., admin promotes to reviewer), the machine doesn't know. Pass role as part of events or use effect() to sync role changes to machine.

4. **No audit trail** - Permission checks happen silently. Add logging to record who tried what action and whether it succeeded. Use debug hooks: `{ debug: { onTransition: (info) => log(info) } }`.

## Related

- [Permit](../permit/) - RBAC engine with wildcards and predicates
- [Ripple](../ripple/) - Reactive signals for user role synchronization
- [Rune](../rune/) - Structured logging for audit trails
- [Form with Validation](./form-validation.md) - Combining validation with permissions
