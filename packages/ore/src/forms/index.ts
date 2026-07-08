/**
 * Form-association helpers built on `ElementInternals`.
 *
 * Split from the package root into its own sub-path: not every component
 * needs `formAssociated`/`ElementInternals` wiring, and keeping it out of the
 * core surface keeps `@vielzeug/ore`'s main entry point scoped to universal
 * authoring primitives (define/html/prop/context/aria).
 */
export { useField, type FormFieldHandle, type FormFieldOptions } from './field';
export { createFormContext, FORM_CONTEXT_KEY, type FormController, type FormFieldContext } from './context';
