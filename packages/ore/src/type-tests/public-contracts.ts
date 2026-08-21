import { signal } from '@vielzeug/ripple';
import * as ore from '../index';
import { define, html, live, prop, ref, unsafeHtml, useEmit, useField } from '../index';

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

// @ts-expect-error Observer factories moved to @vielzeug/sentinel.
const removedResizeObserver = ore.resizeObserver;

// @ts-expect-error Observer factories moved to @vielzeug/sentinel.
const removedIntersectionObserver = ore.intersectionObserver;

// @ts-expect-error Observer factories moved to @vielzeug/sentinel.
const removedMediaObserver = ore.mediaObserver;

// @ts-expect-error Mutation observation now uses the native MutationObserver API.
const removedMutationObserver = ore.mutationObserver;

// @ts-expect-error model() was removed in favor of explicit value and event bindings.
const removedModel = import('../directives/model');

// @ts-expect-error form policy belongs to Forge; Ore no longer exposes a form context.
const removedFormContext = import('../forms/context');

void removedModel;
void removedFormContext;
void removedMediaObserver;
void removedMutationObserver;
void removedResizeObserver;
void removedIntersectionObserver;
