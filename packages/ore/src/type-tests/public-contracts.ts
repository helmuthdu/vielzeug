import { signal } from '@vielzeug/ripple';
import * as ore from '../index';
import { define, html, model, prop, ref, unsafeHtml, useEmit, useField } from '../index';

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
        value=${model(value)} />
      ${unsafeHtml('<strong>trusted fixture</strong>')}
    `;
  },
});

// Prop types infer from `props` when the generic is omitted.
define('ore-contracts-inferred', {
  props: {
    count: prop.number(0),
    label: prop.string(),
    tone: prop.oneOf(['info', 'warn'] as const, 'info'),
  },
  setup(props) {
    const count: number = props.count.value;
    const label: string | undefined = props.label.value;
    const tone: 'info' | 'warn' = props.tone.value;

    // @ts-expect-error Undeclared props are not on the inferred props object.
    void props.missing;

    return html`<span>${count} ${label} ${tone}</span>`;
  },
});

// An explicit generic stays a contract: every declared key needs a definition.
define<{ count: number; label?: string }>('ore-contracts-explicit', {
  // @ts-expect-error `label` is declared on the props type but has no definition.
  props: { count: prop.number(0) },
  setup: () => null,
});

// @ts-expect-error live() was removed: model() covers controlled inputs.
const removedLive = ore.live;

// @ts-expect-error Observer factories moved to @vielzeug/sentinel.
const removedResizeObserver = ore.resizeObserver;

// @ts-expect-error Observer factories moved to @vielzeug/sentinel.
const removedIntersectionObserver = ore.intersectionObserver;

// @ts-expect-error Observer factories moved to @vielzeug/sentinel.
const removedMediaObserver = ore.mediaObserver;

// @ts-expect-error Mutation observation now uses the native MutationObserver API.
const removedMutationObserver = ore.mutationObserver;

// @ts-expect-error form policy belongs to Forge; Ore no longer exposes a form context.
const removedFormContext = import('../forms/context');

void removedFormContext;
void removedLive;
void removedMediaObserver;
void removedMutationObserver;
void removedResizeObserver;
void removedIntersectionObserver;
