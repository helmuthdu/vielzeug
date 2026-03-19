---
title: 'Formit Examples — Multi-Step Wizard'
description: 'Multi-Step Wizard examples for formit.'
---

## Multi-Step Wizard

## Problem

Implement multi-step wizard in a production-friendly way with `@vielzeug/formit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/formit` installed.

Multi-step form with step-by-step validation.

```typescript
import { createForm } from '@vielzeug/formit';

const wizardForm = createForm({
  defaultValues: {
    // Step 1: Personal Info
    firstName: '',
    lastName: '',
    email: '',
    // Step 2: Address
    street: '',
    city: '',
    zipCode: '',
    // Step 3: Payment
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  },
  validators: {
    firstName: (v) => (!v ? 'First name is required' : undefined),
    lastName: (v) => (!v ? 'Last name is required' : undefined),
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    ],
    street: (v) => (!v ? 'Street is required' : undefined),
    city: (v) => (!v ? 'City is required' : undefined),
    zipCode: [
      (v) => (!v ? 'ZIP code is required' : undefined),
      (v) => (v && !/^\d{5}$/.test(String(v)) ? 'Invalid ZIP code' : undefined),
    ],
    cardNumber: [
      (v) => (!v ? 'Card number is required' : undefined),
      (v) => (v && !/^\d{16}$/.test(String(v).replace(/\s/g, '')) ? 'Invalid card number' : undefined),
    ],
    expiryDate: (v) => (!v ? 'Expiry date is required' : undefined),
    cvv: [
      (v) => (!v ? 'CVV is required' : undefined),
      (v) => (v && !/^\d{3,4}$/.test(String(v)) ? 'Invalid CVV' : undefined),
    ],
  },
});

// Step configuration
const steps = [
  { title: 'Personal Info', fields: ['firstName', 'lastName', 'email'] },
  { title: 'Address', fields: ['street', 'city', 'zipCode'] },
  { title: 'Payment', fields: ['cardNumber', 'expiryDate', 'cvv'] },
];

let currentStep = 0;

// Validate current step
async function validateCurrentStep() {
  const { valid } = await wizardForm.validate({ fields: steps[currentStep].fields });
  return valid;
}

// Navigate to next step
async function nextStep() {
  const isValid = await validateCurrentStep();
  if (isValid && currentStep < steps.length - 1) {
    currentStep++;
    updateStepUI();
  }
}

// Submit wizard
async function submitWizard() {
  const isValid = await validateCurrentStep();
  if (isValid) {
    await wizardForm.submit(async (values) => {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      return response.json();
    });
  }
}

function updateStepUI() {
  console.log(`Step ${currentStep + 1}/${steps.length}: ${steps[currentStep].title}`);
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
