---
title: Multi-Step Wizard with Routing
description: Sync a multi-step wizard state machine with URL routing using Clockwork and Wayfinder.
---

## Problem

Multi-step wizards need to maintain both internal state and URL state. Users expect:
- Back/forward buttons to navigate steps
- Bookmarkable step URLs
- Syncing between machine state and route changes
- Preserving form data across navigation

Without coordination, the machine state and route can get out of sync, causing confusing UX.

## Solution

Use Machine to manage wizard steps with Wayfinder to sync the current step to the URL. The machine guards validate transitions and the router handles URL changes.

```ts
import { defineMachine, interpret } from '@vielzeug/clockwork';
import { createRouter, navigate } from '@vielzeug/wayfinder';

type WizardEvent =
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SUBMIT'; formData: Record<string, unknown> }
  | { type: 'ROUTE_CHANGE'; step: string };

const wizardMachine = defineMachine({
  initial: 'step1',
  context: {
    formData: {},
    error: '',
  },
  states: {
    step1: {
      on: {
        NEXT: [{ target: 'step2', actions: [recordStep1Data] }],
        ROUTE_CHANGE: [{ target: 'step1' }],
      },
    },
    step2: {
      on: {
        PREV: [{ target: 'step1' }],
        NEXT: [
          {
            target: 'step3',
            guard: ({ context }) => validateStep2(context),
            actions: [recordStep2Data],
          },
        ],
        ROUTE_CHANGE: [{ target: 'step2' }],
      },
    },
    step3: {
      on: {
        PREV: [{ target: 'step2' }],
        SUBMIT: [
          {
            target: 'submitted',
            actions: [recordStep3Data],
          },
        ],
        ROUTE_CHANGE: [{ target: 'step3' }],
      },
    },
    submitted: {
      type: 'final',
      entry: [uploadFormData],
    },
  },
});

const recordStep1Data = ({ context, event }: any) => {
  context.formData = {
    ...context.formData,
    name: event.data?.name || '',
  };
};

const recordStep2Data = ({ context, event }: any) => {
  context.formData = {
    ...context.formData,
    ...event.data,
  };
};

const recordStep3Data = ({ context, event }: any) => {
  context.formData = {
    ...context.formData,
    ...event.formData,
  };
};

const uploadFormData = ({ context }: any) => {
  // Submit context.formData to API
};

const validateStep2 = (ctx: any) => {
  return ctx.formData.name && ctx.formData.name.length > 2;
};

// Setup coordination
const machine = interpret(wizardMachine);
const router = createRouter();

// When machine changes state, update route
machine.state.listen((state) => {
  navigate(`/wizard/${state}`);
});

// When route changes, notify machine
router.on('navigate', ({ path }) => {
  const step = path.split('/')[2];
  if (step && ['step1', 'step2', 'step3'].includes(step)) {
    machine.send({ type: 'ROUTE_CHANGE', step });
  }
});

// Handle next/previous button clicks
export function handleNext() {
  machine.send({ type: 'NEXT' });
}

export function handlePrev() {
  machine.send({ type: 'PREV' });
}

export function handleSubmit(formData: Record<string, unknown>) {
  machine.send({ type: 'SUBMIT', formData });
}
```

## Pitfalls

1. **Route changes don't update machine state** - Must dispatch ROUTE_CHANGE event when router navigation occurs, not assume they stay in sync automatically.

2. **Clockwork transitions block route updates** - If a guard fails on ROUTE_CHANGE, the URL changes but machine stays in old state. Provide a FALLBACK transition for failed ROUTE_CHANGE events.

3. **Form data lost on back navigation** - Context is preserved in machine, but if user navigates away and returns, context may be cleared. Persist formData to localStorage on each step.

4. **Duplicate events on startup** - Router listener and machine both may fire during initialization. Use a flag to prevent processing route change events until machine is fully initialized.

## Related

- [Fetch with Retry](./fetch-retry.md) - Async patterns for step submission
- [Wayfinder](../wayfinder/) - Client-side routing with middleware
- [Form with Validation](./form-validation.md) - Multi-step form patterns
- [Vault](../vault/) - Persist wizard state across sessions
