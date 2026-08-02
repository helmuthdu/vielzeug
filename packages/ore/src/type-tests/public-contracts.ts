import { signal } from '@vielzeug/ripple';

import {
  define,
  html,
  intersectionObserver,
  live,
  prop,
  ref,
  resizeObserver,
  unsafeHtml,
  useEmit,
  useField,
} from '../index';

const inputRef = ref<HTMLInputElement>();

define<{ count: number }>('ore-contracts', {
  formAssociated: true,
  props: { count: prop.number(0) },
  setup(props) {
    const emit = useEmit<{ change: { value: number } }>();
    const value = signal('');

    useField({ value });
    emit('change', { value: props.count.value });

    return html`
      <input
        ref=${inputRef}
        value=${live(value)}
        @input=${(event: Event) => (value.value = (event.target as HTMLInputElement).value)} />
      ${unsafeHtml('<strong>trusted fixture</strong>')}
    `;
  },
});

const element = document.createElement('div');

resizeObserver(element);
intersectionObserver(element);

// @ts-expect-error model() was removed in favor of explicit value and event bindings.
const removedModel = import('../directives/model');

// @ts-expect-error form policy belongs to Forge; Ore no longer exposes a form context.
const removedFormContext = import('../forms/context');

void removedModel;
void removedFormContext;
