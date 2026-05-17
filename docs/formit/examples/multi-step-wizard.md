---
title: 'Formit Examples — Multi-Step Wizard'
description: 'Multi-Step Wizard examples for formit.'
---

## Multi-Step Wizard

### Problem

A long form is split into pages that users move through sequentially. Each page is validated before advancing, the user can go back to edit earlier pages, and the final step submits the complete dataset.

### Solution

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
    email: (v) => (!v ? 'Email is required' : v && !String(v).includes('@') ? 'Invalid email' : undefined),
    street: (v) => (!v ? 'Street is required' : undefined),
    city: (v) => (!v ? 'City is required' : undefined),
    zipCode: (v) => (!v ? 'ZIP code is required' : v && !/^\d{5}$/.test(String(v)) ? 'Invalid ZIP code' : undefined),
    cardNumber: (v) =>
      !v
        ? 'Card number is required'
        : v && !/^\d{16}$/.test(String(v).replace(/\s/g, ''))
          ? 'Invalid card number'
          : undefined,
    expiryDate: (v) => (!v ? 'Expiry date is required' : undefined),
    cvv: (v) => (!v ? 'CVV is required' : v && !/^\d{3,4}$/.test(String(v)) ? 'Invalid CVV' : undefined),
  },
});

// Step configuration
const steps = [
  { title: 'Personal Info', fields: ['firstName', 'lastName', 'email'] as const },
  { title: 'Address', fields: ['street', 'city', 'zipCode'] as const },
  { title: 'Payment', fields: ['cardNumber', 'expiryDate', 'cvv'] as const },
] as const;

let currentStep = 0;

// Validate current step
async function validateCurrentStep() {
  const { valid } = await wizardForm.validateFields([...steps[currentStep].fields]);
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
    const result = await wizardForm.submit(async (values) => {
      const response = await fetch('/api/checkout', {
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
}

function updateStepUI() {
  console.log(`Step ${currentStep + 1}/${steps.length}: ${steps[currentStep].title}`);
}
```


### Pitfalls

- Navigating backward does not re-trigger validation for already-completed steps. If you want to re-surface stale errors on return, call `form.validate()` explicitly when the user goes back.
- `form.submit()` validates all fields across all steps, not just the current one. This is correct for final submission but call `form.validateField(name)` for per-step validation.
- Storing the current step in a URL parameter without syncing it to form state can show the wrong step when the user navigates with the browser back button.

### Related
- [Routing Between Steps (Routeit)](/routeit/examples/route-table-basics)
- [Schema Validation with Validit](/validit/)

- [Best Practices](./best-practices.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Dynamic Form Fields](./dynamic-form-fields.md)
