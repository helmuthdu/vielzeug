/**
 * Craftit - New Features Examples
 * Demonstrates context system, form integration, and template helpers
 */

import { useForm, useFormField, validators } from '..';

describe('Form Integration', () => {
  it('should create form field with validation', async () => {
    const field = useFormField({
      rules: [validators.required('Name is required')],
      value: '',
    });

    expect(field.value.value).toBe('');
    expect(field.error.value).toBeNull();
    expect(field.valid.value).toBe(true); // Not validated yet

    // Validate empty field
    const isValid = await field.validate();
    expect(isValid).toBe(false);
    expect(field.error.value).toBe('Name is required');
    expect(field.valid.value).toBe(false);

    // Fix the value
    field.value.value = 'John';
    const isValid2 = await field.validate();
    expect(isValid2).toBe(true);
    expect(field.error.value).toBeNull();
    expect(field.valid.value).toBe(true);
  });

  it('should validate email', async () => {
    const field = useFormField({
      rules: [validators.email()],
      value: '',
    });

    field.value.value = 'invalid-email';
    const isValid = await field.validate();
    expect(isValid).toBe(false);
    expect(field.error.value).toBe('Invalid email address');

    field.value.value = 'user@example.com';
    const isValid2 = await field.validate();
    expect(isValid2).toBe(true);
    expect(field.error.value).toBeNull();
  });

  it('should validate string length', async () => {
    const field = useFormField({
      rules: [validators.minLength(3), validators.maxLength(10)],
      value: '',
    });

    field.value.value = 'ab';
    await field.validate();
    expect(field.error.value).toBe('Must be at least 3 characters');

    field.value.value = 'abc';
    await field.validate();
    expect(field.error.value).toBeNull();

    field.value.value = 'this is too long';
    await field.validate();
    expect(field.error.value).toBe('Must be at most 10 characters');
  });

  it('should create and validate form', async () => {
    const form = useForm({
      email: {
        rules: [validators.required(), validators.email()],
        value: '',
      },
      password: {
        rules: [validators.required(), validators.minLength(8)],
        value: '',
      },
    });

    expect(form.valid.value).toBe(true); // Not validated yet

    // Validate empty form
    const isValid = await form.validate();
    expect(isValid).toBe(false);

    // Fill in valid values
    form.fields.email.value.value = 'user@example.com';
    form.fields.password.value.value = 'password123';

    const isValid2 = await form.validate();
    expect(isValid2).toBe(true);
    expect(form.valid.value).toBe(true);
  });

  it('should handle form submission', async () => {
    const onSubmitSpy = vi.fn();

    const form = useForm({
      username: {
        rules: [validators.required()],
        value: 'john',
      },
    });

    const handleSubmit = form.handleSubmit(onSubmitSpy);
    const event = new Event('submit', { cancelable: true });

    await handleSubmit(event);

    expect(onSubmitSpy).toHaveBeenCalledWith({ username: 'john' });
    expect(event.defaultPrevented).toBe(true);
  });

  it('should get and set form values', () => {
    const form = useForm({
      age: { value: 30 },
      name: { value: 'John' },
    });

    const values = form.getValues();
    expect(values).toEqual({ age: 30, name: 'John' });

    form.setValues({ age: 25, name: 'Jane' });
    expect(form.fields.name.value.value).toBe('Jane');
    expect(form.fields.age.value.value).toBe(25);
  });

  it('should reset form', async () => {
    const form = useForm({
      email: {
        rules: [validators.email()],
        value: 'initial@example.com',
      },
    });

    // Change and validate
    form.fields.email.value.value = 'changed@example.com';
    form.fields.email.touch();
    await form.validate();

    expect(form.fields.email.touched.value).toBe(true);
    expect(form.fields.email.value.value).toBe('changed@example.com');

    // Reset
    form.reset();

    expect(form.fields.email.value.value).toBe('initial@example.com');
    expect(form.fields.email.touched.value).toBe(false);
    expect(form.submitted.value).toBe(false);
  });
});
