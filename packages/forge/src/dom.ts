import type { Field, ReadonlyDeep } from './types';

export type FieldBindingOptions<Element extends HTMLElement, V> = Readonly<{
  event?: keyof HTMLElementEventMap;
  read(element: Element): V;
  write?: (element: Element, value: ReadonlyDeep<V>) => void;
}>;

/** Binds one field to one element without imposing parsing, debounce, or validation policy. */
export function bindField<Element extends HTMLElement, V>(
  element: Element,
  field: Field<V>,
  options: FieldBindingOptions<Element, V>,
): () => void {
  const event = options.event ?? 'input';
  let updatingFromElement = false;
  const onInput = () => {
    updatingFromElement = true;

    try {
      field.set(options.read(element));
    } finally {
      updatingFromElement = false;
    }
  };
  const onBlur = () => field.touch();
  let hasRendered = false;
  let rendered = field.value;
  const unsubscribe = options.write
    ? field.subscribe(
        ({ value }) => {
          if (updatingFromElement) {
            hasRendered = true;
            rendered = value;

            return;
          }

          if (hasRendered && value === rendered) return;

          hasRendered = true;
          rendered = value;
          options.write?.(element, value);
        },
        { immediate: true },
      )
    : () => {};

  element.addEventListener(event, onInput);
  element.addEventListener('blur', onBlur);

  return () => {
    element.removeEventListener(event, onInput);
    element.removeEventListener('blur', onBlur);
    unsubscribe();
  };
}
