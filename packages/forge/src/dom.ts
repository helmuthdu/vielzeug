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
  let hasRendered = false;
  let rendered = field.value;

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
            hasRendered = true;
            rendered = value;
            return;
          }
          if (hasRendered && Object.is(value, rendered)) return;
          hasRendered = true;
          rendered = value;
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
