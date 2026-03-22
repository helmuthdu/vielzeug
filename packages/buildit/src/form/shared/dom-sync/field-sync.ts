import { effect, handle, type ReadonlySignal } from '@vielzeug/craftit';

import {
  parsePositiveNumber,
  resolveCounterState,
  resolveMergedAssistiveText,
  resolveSplitAssistiveText,
} from '../utils';

export type CounterConfig = {
  count: ReadonlySignal<number> | (() => number);
  format?: 'split' | 'merged';
  maxLength: ReadonlySignal<number | undefined> | (() => number | undefined);
  ref: { value: HTMLElement | null | undefined };
};

export type SplitAssistiveConfig = {
  error: ReadonlySignal<string | undefined> | (() => string | undefined);
  errorRef: { value: HTMLDivElement | null | undefined };
  helper: ReadonlySignal<string | undefined> | (() => string | undefined);
  helperRef: { value: HTMLDivElement | null | undefined };
};

export type MergedAssistiveConfig = {
  error: ReadonlySignal<string | undefined> | (() => string | undefined);
  helper: ReadonlySignal<string | undefined> | (() => string | undefined);
  ref: { value: HTMLDivElement | null | undefined };
};

export function syncCounter(config: CounterConfig): void {
  effect(() => {
    const counterRef = config.ref.value;

    if (!counterRef) return;

    const count = typeof config.count === 'function' ? config.count() : config.count.value;
    const maxLen = typeof config.maxLength === 'function' ? config.maxLength() : config.maxLength.value;
    const state = resolveCounterState(count, parsePositiveNumber(maxLen));

    counterRef.hidden = state.hidden;

    if (config.format === 'merged') {
      counterRef.textContent = state.text.replace(' / ', '/');
      counterRef.className = state.atLimit ? 'counter at-limit' : state.nearLimit ? 'counter near-limit' : 'counter';
    } else {
      counterRef.textContent = state.text;
      counterRef.removeAttribute('data-near-limit');
      counterRef.removeAttribute('data-at-limit');

      if (state.atLimit) counterRef.setAttribute('data-at-limit', '');
      else if (state.nearLimit) counterRef.setAttribute('data-near-limit', '');
    }
  });
}

export function syncSplitAssistive(config: SplitAssistiveConfig): void {
  effect(() => {
    const error = typeof config.error === 'function' ? config.error() : config.error.value;
    const helper = typeof config.helper === 'function' ? config.helper() : config.helper.value;
    const state = resolveSplitAssistiveText(error, helper);

    if (config.helperRef.value) {
      config.helperRef.value.textContent = state.helperText;
      config.helperRef.value.hidden = state.helperHidden;
    }

    if (config.errorRef.value) {
      config.errorRef.value.textContent = state.errorText;
      config.errorRef.value.hidden = state.errorHidden;
    }
  });
}

export function syncMergedAssistive(config: MergedAssistiveConfig): void {
  effect(() => {
    const ref = config.ref.value;

    if (!ref) return;

    const error = typeof config.error === 'function' ? config.error() : config.error.value;
    const helper = typeof config.helper === 'function' ? config.helper() : config.helper.value;
    const state = resolveMergedAssistiveText(error, helper);

    ref.textContent = state.text;
    ref.hidden = state.hidden;
  });
}

export type FieldEventHandlers = {
  onBlur?: (event: FocusEvent) => void;
  onChange?: (event: Event, value: string) => void;
  onInput?: (event: Event, value: string) => void;
};

export function setupFieldEvents(
  element: HTMLInputElement | HTMLTextAreaElement | null | undefined,
  handlers: FieldEventHandlers,
): void {
  if (!element) return;

  if (handlers.onInput) {
    handle(element, 'input', (event: Event) => {
      handlers.onInput!(event, element.value);
    });
  }

  if (handlers.onChange) {
    handle(element, 'change', (event: Event) => {
      handlers.onChange!(event, element.value);
    });
  }

  if (handlers.onBlur) {
    handle(element, 'blur', handlers.onBlur as EventListener);
  }
}
