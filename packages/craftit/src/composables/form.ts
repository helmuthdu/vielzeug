/**
 * Craftit - Form Integration
 * Utilities for working with forms and form controls
 */

import { onMount } from '../core/lifecycle';
import { type ComputedSignal, computed, type Signal, signal } from '../core/signal';
import { onCleanup } from './context';
import type { Ref } from './ref';

/**
 * Form field value type
 */
export type FormFieldValue = string | number | boolean | File | FileList | null;

/**
 * Form validation rule
 */
export interface ValidationRule<T = FormFieldValue> {
  /** Validation function */
  validate: (value: T) => boolean | string | Promise<boolean | string>;
  /** Error message if validation returns false */
  message?: string;
}

/**
 * Form field configuration
 */
export interface FormFieldConfig<T = FormFieldValue> {
  /** Initial value */
  value?: T;
  /** Validation rules */
  rules?: ValidationRule<T>[];
  /** Whether to validate on change */
  validateOnChange?: boolean;
  /** Whether to validate on blur */
  validateOnBlur?: boolean;
}

/**
 * Form field state
 */
export interface FormField<T = FormFieldValue> {
  /** Current value */
  value: Signal<T>;
  /** Error message (null if valid) */
  error: Signal<string | null>;
  /** Whether field has been touched */
  touched: Signal<boolean>;
  /** Whether field is currently validating */
  validating: Signal<boolean>;
  /** Whether field is valid */
  valid: ComputedSignal<boolean>;
  /** Validate the field */
  validate: () => Promise<boolean>;
  /** Reset the field */
  reset: () => void;
  /** Mark as touched */
  touch: () => void;
}

/**
 * Create a form field
 */
export function useFormField<T = FormFieldValue>(config: FormFieldConfig<T> = {}): FormField<T> {
  const value = signal(config.value ?? (null as T));
  const error = signal<string | null>(null);
  const touched = signal(false);
  const validating = signal(false);

  const valid = computed(() => error.value === null);

  const validate = async (): Promise<boolean> => {
    if (!config.rules || config.rules.length === 0) {
      error.value = null;
      return true;
    }

    validating.value = true;

    try {
      for (const rule of config.rules) {
        const result = await rule.validate(value.value);

        if (result === false) {
          error.value = rule.message || 'Invalid value';
          return false;
        }

        if (typeof result === 'string') {
          error.value = result;
          return false;
        }
      }

      error.value = null;
      return true;
    } finally {
      validating.value = false;
    }
  };

  const reset = () => {
    value.value = config.value ?? (null as T);
    error.value = null;
    touched.value = false;
  };

  const touch = () => {
    touched.value = true;
  };

  return {
    error,
    reset,
    touch,
    touched,
    valid,
    validate,
    validating,
    value,
  };
}

/**
 * Form state
 */
export interface Form {
  /** Form fields */
  fields: Record<string, FormField>;
  /** Whether form is valid */
  valid: ComputedSignal<boolean>;
  /** Whether form is submitting */
  submitting: Signal<boolean>;
  /** Whether form has been submitted */
  submitted: Signal<boolean>;
  /** Validate all fields */
  validate: () => Promise<boolean>;
  /** Reset the form */
  reset: () => void;
  /** Get form values */
  getValues: () => Record<string, FormFieldValue>;
  /** Set form values */
  setValues: (values: Record<string, FormFieldValue>) => void;
  /** Handle form submission */
  handleSubmit: (
    onSubmit: (values: Record<string, FormFieldValue>) => void | Promise<void>,
  ) => (e: Event) => Promise<void>;
}

/**
 * Create a form
 */
export function useForm(fields: Record<string, FormFieldConfig> = {}): Form {
  const formFields: Record<string, FormField> = {};

  // Initialize fields
  for (const [key, config] of Object.entries(fields)) {
    formFields[key] = useFormField(config);
  }

  const submitting = signal(false);
  const submitted = signal(false);

  const valid = computed(() => {
    return Object.values(formFields).every((field) => field.valid.value);
  });

  const validate = async (): Promise<boolean> => {
    const results = await Promise.all(Object.values(formFields).map((field) => field.validate()));
    return results.every((r) => r);
  };

  const reset = () => {
    for (const field of Object.values(formFields)) {
      field.reset();
    }
    submitted.value = false;
  };

  const getValues = (): Record<string, FormFieldValue> => {
    const values: Record<string, FormFieldValue> = {};
    for (const [key, field] of Object.entries(formFields)) {
      values[key] = field.value.value;
    }
    return values;
  };

  const setValues = (values: Record<string, FormFieldValue>) => {
    for (const [key, value] of Object.entries(values)) {
      if (formFields[key]) {
        formFields[key].value.value = value;
      }
    }
  };

  const handleSubmit =
    (onSubmit: (values: Record<string, FormFieldValue>) => void | Promise<void>) => async (e: Event) => {
      e.preventDefault();

      // Mark all fields as touched
      for (const field of Object.values(formFields)) {
        field.touch();
      }

      // Validate
      const isValid = await validate();
      if (!isValid) {
        return;
      }

      submitting.value = true;
      submitted.value = true;

      try {
        await onSubmit(getValues());
      } finally {
        submitting.value = false;
      }
    };

  return {
    fields: formFields,
    getValues,
    handleSubmit,
    reset,
    setValues,
    submitted,
    submitting,
    valid,
    validate,
  };
}

/**
 * Bind a form field to an input element
 */
export function bindFormField<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
  field: FormField,
  inputRef: Ref<T>,
  options: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
  } = {},
): void {
  onMount(() => {
    const input = inputRef.value;
    if (!input) return;

    // Set initial value
    if (field.value.value !== null && field.value.value !== undefined) {
      if (input instanceof HTMLInputElement && input.type === 'checkbox') {
        input.checked = Boolean(field.value.value);
      } else if (input instanceof HTMLInputElement && input.type === 'file') {
        // Can't set file input value
      } else {
        input.value = String(field.value.value);
      }
    }

    // Handle input changes
    const handleInput = (e: Event) => {
      const target = e.target as T;

      if (target instanceof HTMLInputElement && target.type === 'checkbox') {
        (field.value as Signal<boolean>).value = target.checked;
      } else if (target instanceof HTMLInputElement && target.type === 'file') {
        (field.value as Signal<FileList | null>).value = target.files;
      } else {
        (field.value as Signal<string>).value = target.value;
      }

      if (options.validateOnChange) {
        field.validate();
      }
    };

    const handleBlur = () => {
      field.touch();
      if (options.validateOnBlur) {
        field.validate();
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('blur', handleBlur);

    // Cleanup
    onCleanup(() => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('blur', handleBlur);
    });
  });
}

/**
 * Built-in validation rules
 */
export const validators = {
  /** Custom validator */
  custom: (
    validate: (value: FormFieldValue) => boolean | string | Promise<boolean | string>,
    message?: string,
  ): ValidationRule => ({
    message,
    validate,
  }),

  /** Email validation */
  email: (message = 'Invalid email address'): ValidationRule => ({
    validate: (value) => {
      // Convert to string for validation
      const stringValue = String(value ?? '');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue)) {
        return message;
      }
      return true;
    },
  }),

  /** Maximum value */
  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      if (value > max) {
        return message || `Must be at most ${max}`;
      }
      return true;
    },
  }),

  /** Maximum length */
  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      const stringValue = String(value ?? '');
      if (stringValue.length > max) {
        return message || `Must be at most ${max} characters`;
      }
      return true;
    },
  }),

  /** Minimum value */
  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      if (value < min) {
        return message || `Must be at least ${min}`;
      }
      return true;
    },
  }),

  /** Minimum length */
  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      const stringValue = String(value ?? '');
      if (stringValue.length < min) {
        return message || `Must be at least ${min} characters`;
      }
      return true;
    },
  }),

  /** Pattern validation */
  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule => ({
    validate: (value) => {
      const stringValue = String(value ?? '');
      if (!regex.test(stringValue)) {
        return message;
      }
      return true;
    },
  }),
  /** Required field */
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === '') {
        return message;
      }
      return true;
    },
  }),
};
