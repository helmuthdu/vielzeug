type FieldHost = HTMLElement & {
  checked?: boolean;
  value?: string;
};

export const defineFieldChecked = (host: HTMLElement, get: () => boolean, set: (checked: boolean) => void): void => {
  Object.defineProperty(host, 'checked', {
    configurable: true,
    enumerable: true,
    get,
    set,
  });
};

export const defineFieldValue = (host: HTMLElement, get: () => string, set: (value: string) => void): void => {
  Object.defineProperty(host, 'value', {
    configurable: true,
    enumerable: true,
    get,
    set,
  });
};

export const dispatchNativeFieldEvent = (host: HTMLElement, type: 'change' | 'input'): void => {
  host.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
};

export const setFieldChecked = (host: HTMLElement, checked: boolean): void => {
  (host as FieldHost).checked = checked;
};

export const setFieldValue = (host: HTMLElement, value: string): void => {
  (host as FieldHost).value = value;
};

/**
 * Reads the `value` off the element an event fired from (`event.currentTarget`), guarding the
 * cast: `undefined` when the target is missing or carries no string `value`. The read-side
 * companion to {@link setFieldValue} — consumers wiring a native `change`/`input` handler to a
 * field no longer re-derive the `(currentTarget as HTMLElement & { value: string }).value` cast.
 */
export const eventFieldValue = (event: Event): string | undefined => {
  const target = event.currentTarget;

  if (target === null || !('value' in target) || typeof target.value !== 'string') return undefined;

  return target.value;
};

/**
 * Reads the `checked` flag off the element an event fired from (`event.currentTarget`), guarding
 * the cast: `false` when the target is missing or carries no boolean `checked`. The read-side
 * companion to {@link setFieldChecked}.
 */
export const eventFieldChecked = (event: Event): boolean => {
  const target = event.currentTarget;

  if (target === null || !('checked' in target) || typeof target.checked !== 'boolean') return false;

  return target.checked;
};
