import type { Form, FormState, Unsubscribe } from './types';

export type ForgeDevtoolsOptions = Readonly<{
  label?: string;
}>;

/** Logs public form-state transitions without coupling diagnostics to form internals. */
export function debugForm<TValues extends Record<string, unknown>>(
  form: Form<TValues>,
  options: ForgeDevtoolsOptions = {},
): Unsubscribe {
  const prefix = `[forge:devtools:${options.label ?? 'form'}]`;
  let previous: FormState<TValues> | undefined;

  return form.subscribe(
    (next) => {
      if (previous) {
        if (previous.submitting !== next.submitting) console.debug(`${prefix} submitting:`, next.submitting);

        if (previous.validating !== next.validating) console.debug(`${prefix} validating:`, next.validating);

        if (previous.valid !== next.valid) console.debug(`${prefix} valid:`, next.valid);
      }

      previous = next;
    },
    { immediate: true },
  );
}
