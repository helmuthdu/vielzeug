export const description = 'Form state management with reactive fields and async validation.';

export const loader = () => import('@vielzeug/forge');

export const apiExports = ['FORM_ERROR', 'createForm', 'schemaValidator', 'toFormData'] as const;
