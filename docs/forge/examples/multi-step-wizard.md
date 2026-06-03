---
title: 'Forge Examples — Multi-Step Wizard'
description: 'Multi-Step Wizard examples for forge.'
---

## Multi-Step Wizard

### Problem

A long form is split into pages that users move through sequentially. Each page is validated before advancing, the user can go back to edit earlier pages, and the final step submits the complete dataset.

### Solution

Use `scope()` to give each step its own relative field namespace. Each step's `scope.validate()` returns only that step's errors so advancing is safe even when sibling steps have pre-existing errors.

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({
  defaultValues: {
    personal: { firstName: '', lastName: '', email: '' },
    address: { street: '', city: '', zipCode: '' },
    payment: { cardNumber: '', expiryDate: '', cvv: '' },
  },
  validators: {
    'personal.firstName': (v) => (!v ? 'First name is required' : undefined),
    'personal.lastName': (v) => (!v ? 'Last name is required' : undefined),
    'personal.email': (v) => (!v ? 'Email is required' : !String(v).includes('@') ? 'Invalid email' : undefined),
    'address.street': (v) => (!v ? 'Street is required' : undefined),
    'address.city': (v) => (!v ? 'City is required' : undefined),
    'address.zipCode': (v) => (!v ? 'ZIP code is required' : !/^\d{5}$/.test(String(v)) ? 'Invalid ZIP' : undefined),
    'payment.cardNumber': (v) =>
      !v
        ? 'Card number is required'
        : !/^\d{16}$/.test(String(v).replace(/\s/g, ''))
          ? 'Invalid card number'
          : undefined,
    'payment.expiryDate': (v) => (!v ? 'Expiry date is required' : undefined),
    'payment.cvv': (v) => (!v ? 'CVV is required' : !/^\d{3,4}$/.test(String(v)) ? 'Invalid CVV' : undefined),
  },
});

// scope() is memoized — repeated calls with the same prefix return the same object
const steps = [
  { title: 'Personal Info', scope: form.scope('personal') },
  { title: 'Address', scope: form.scope('address') },
  { title: 'Payment', scope: form.scope('payment') },
];

let currentStep = 0;

async function nextStep() {
  // validate() on the scoped form validates only this step's fields and
  // returns relative-key errors — sibling errors do not bleed in
  const { valid } = await steps[currentStep].scope.validate();

  if (valid && currentStep < steps.length - 1) {
    currentStep++;
    updateStepUI();
  }
}

async function submitWizard() {
  // submit() on the parent form validates everything and sends all values
  const result = await form.submit(async (values) => {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    return response.json();
  });

  if (!result.ok) return;

  window.location.href = '/confirmation';
}

function updateStepUI() {
  console.log(`Step ${currentStep + 1}/${steps.length}: ${steps[currentStep].title}`);
}
```

### Pitfalls

- **`scope()` is memoized** — repeated calls with the same prefix return the same cached object. However, calling it during a render or inside a tight loop is still wasteful; store the result for clarity.
- `scope.state` reflects the **full** form — `state.isValid` is `false` if any step has an error. Use `scope.validate()` for per-step validity, not `state.isValid`.
- Navigating backward does not re-run validation. If you want to re-surface errors on return, call `scope.validate()` when the user navigates to a step.
- `form.submit()` validates all fields across all steps — this is correct for final submission. Use `scope.validate()` for per-step validation when advancing.

### Related

- [Routing Between Steps (Wayfinder)](/wayfinder/)
- [Schema Validation with Sieve](/spell/)
- [Dynamic Form Fields](./dynamic-form-fields.md)
