import { type Signal } from '@vielzeug/stateit';

import { type Directive, listen } from '../internal';
import { attrs } from './attr';

export type BindMode = 'checked' | 'value';

export type BindOptions<T extends boolean | number | string> = {
  as?: BindMode;
  event?: string;
  parse?: (value: boolean | string, element: HTMLElement, event: Event) => T;
  value: Signal<T>;
};

const isBindOptions = <T extends boolean | number | string>(
  input: Signal<T> | BindOptions<T>,
): input is BindOptions<T> => {
  if (typeof input !== 'object' || input === null || !('value' in input)) return false;

  const candidate = (input as BindOptions<T>).value as unknown;

  return typeof candidate === 'object' && candidate !== null && 'value' in (candidate as object);
};

const resolveMode = (element: HTMLElement, explicitMode?: BindMode): BindMode => {
  if (explicitMode) return explicitMode;

  if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
    return 'checked';
  }

  return 'value';
};

const resolveEventName = (element: HTMLElement, mode: BindMode, explicitEvent?: string): string => {
  if (explicitEvent) return explicitEvent;

  if (mode === 'checked' || element instanceof HTMLSelectElement) return 'change';

  return 'input';
};

const assertBindableTarget = (element: HTMLElement, mode: BindMode): void => {
  if (mode === 'checked') {
    if (!(element instanceof HTMLInputElement) || (element.type !== 'checkbox' && element.type !== 'radio')) {
      throw new Error('[craftit:bind] mode "checked" requires <input type="checkbox|radio">.');
    }

    return;
  }

  if (
    !(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    )
  ) {
    throw new Error('[craftit:bind] value binding requires <input>, <textarea>, or <select>.');
  }
};

const validateBindOptions = <T extends boolean | number | string>(options: BindOptions<T>): void => {
  if (options.event !== undefined && options.event.trim() === '') {
    throw new Error('[craftit:bind] options.event must be a non-empty event name.');
  }

  if (options.parse !== undefined && typeof options.parse !== 'function') {
    throw new Error('[craftit:bind] options.parse must be a function when provided.');
  }
};

const readBoundValue = <T extends boolean | number | string>(
  element: HTMLElement,
  mode: BindMode,
  options: BindOptions<T>,
  event: Event,
): T => {
  const raw = mode === 'checked' ? (element as HTMLInputElement).checked : (element as HTMLInputElement).value;

  if (options.parse) return options.parse(raw, element, event);

  if (mode === 'checked') return raw as T;

  if (typeof options.value.value === 'number') return Number(raw) as T;

  return raw as T;
};

/**
 * Creates a two-way binding between a writable Signal and a form element.
 *
 * Defaults:
 * - Checkbox/radio elements bind `.checked` via `change`
 * - Other form elements bind `.value` via `input`
 * - Select elements bind `.value` via `change`
 * - Number signals default to `Number(el.value)` unless you provide `parse`
 *
 * Internally this reuses craftit's shared property-binding path, so `.value`,
 * `.checked`, `attrs(...)`, and `spread({ '.value': ... })` stay in sync.
 *
 * Use in spread position on any form element.
 *
 * @example
 * import { bind } from '@vielzeug/craftit/directives';
 *
 * const name = signal('');
 * html`<input ${bind({ value: name })} />`
 *
 * const accepted = signal(false);
 * html`<input type="checkbox" ${bind({ value: accepted })} />`
 *
 * const amount = signal(1);
 * html`<input type="number" ${bind({ value: amount })} />`
 */
export function bind<T extends boolean | number | string>(value: Signal<T>): Directive;
export function bind<T extends boolean | number | string>(options: BindOptions<T>): Directive;
export function bind<T extends boolean | number | string>(input: Signal<T> | BindOptions<T>): Directive {
  return {
    mount(el, context) {
      const options = isBindOptions(input) ? input : ({ value: input } as BindOptions<T>);

      validateBindOptions(options);

      const mode = resolveMode(el, options.as);

      assertBindableTarget(el, mode);

      const eventName = resolveEventName(el, mode, options.event);

      attrs(mode === 'checked' ? { checked: options.value } : { value: options.value }).mount!(el, context);

      context.registerCleanup(
        listen(el, eventName, (event: Event) => {
          const next = readBoundValue(el, mode, options, event);

          if (!Object.is(options.value.value, next)) options.value.value = next;
        }),
      );
    },
  };
}
