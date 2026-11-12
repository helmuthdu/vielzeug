import type { Field, FieldState } from './types.js';

export type FieldBindingOptions<Element extends HTMLElement, Value> = Readonly<{
  event?: keyof HTMLElementEventMap;
  read(element: Element): Value;
  write?: (element: Element, value: FieldState<Value>['value']) => void;
}>;

export function bindField<Element extends HTMLElement, Value>(
  element: Element,
  field: Field<Value>,
  options: FieldBindingOptions<Element, Value>,
): () => void {
  const event = options.event ?? 'input';
  let updatingFromElement = false;
  // A unique sentinel: no form value can ever equal it, so the first notification always renders.
  let lastRendered: unknown = Symbol('unrendered');

  const onInput = (): void => {
    updatingFromElement = true;
    try {
      field.set(options.read(element));
    } finally {
      updatingFromElement = false;
    }
  };
  const onBlur = (): void => field.touch();
  const unsubscribe = options.write
    ? field.subscribe(
        ({ value }) => {
          if (updatingFromElement) {
            lastRendered = value;
            return;
          }
          if (Object.is(value, lastRendered)) return;
          lastRendered = value;
          options.write?.(element, value);
        },
        { immediate: true },
      )
    : () => undefined;

  element.addEventListener(event, onInput);
  element.addEventListener('blur', onBlur);

  return () => {
    element.removeEventListener(event, onInput);
    element.removeEventListener('blur', onBlur);
    unsubscribe();
  };
}
