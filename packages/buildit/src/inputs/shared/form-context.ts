import { createContext, type ReadonlySignal } from '@vielzeug/craftit';

import type { ComponentSize, VisualVariant } from '../../types';

export type FormContext = {
  /** Whether all child fields are disabled */
  disabled: ReadonlySignal<boolean>;
  /** Default size propagated to all child form fields */
  size: ReadonlySignal<ComponentSize | undefined>;
  /**
   * When to validate child form controls:
   * - `'submit'` (default): only on form submit
   * - `'blur'`: validate each field when it loses focus
   * - `'change'`: validate on every value change
   */
  validateOn: ReadonlySignal<'submit' | 'blur' | 'change'>;
  /** Default variant propagated to all child form fields */
  variant: ReadonlySignal<Exclude<VisualVariant, 'glass' | 'frost' | 'text'> | undefined>;
};

export const FORM_CTX = createContext<FormContext>('FormContext');
