import { type ChoiceFieldHandle, type ChoiceFieldOptions, createChoiceField } from './choice-field';
import { type BaseOptionItem, type OptionListHandle, type OptionListOptions, createOptionList } from './option-list';

// ── Composite control ─────────────────────────────────────────────────────────
//
// `createComposite` composes `createChoiceField` + `createOptionList` — the
// pairing required by every dropdown field (combobox, select, multi-select).
// It eliminates the ~50-line boilerplate of wiring the two primitives together
// and exposes a single merged handle.
//
// Pass `listFactory` as a factory `(choice: ChoiceFieldHandle) => options` when the
// option list configuration needs to reference signals or IDs from the built
// choice handle (e.g. `choice.fieldId`, `choice.disabled`, `choice.triggerValidation`).

export type CompositeControlHandle<T extends BaseOptionItem> = {
  /** ChoiceField handle — field state, validation, assistive text. */
  choice: ChoiceFieldHandle;
  /** Call on component teardown to release all event listeners and effects. */
  cleanup: () => void;
  /** OptionList handle — open/close, navigation, positioner. */
  optionList: OptionListHandle<T>;
};

export type CompositeOptions<T extends BaseOptionItem> = {
  field: ChoiceFieldOptions;
  listFactory: (choice: ChoiceFieldHandle) => OptionListOptions<T>;
};

/**
 * Composes a choice field and an option list into a single handle.
 *
 * `list` is a factory that receives the built choice handle so it can reference
 * signals or IDs such as `choice.fieldId`, `choice.disabled`, and
 * `choice.triggerValidation`.
 *
 * @example
 * const { choice, optionList, cleanup } = createComposite<OptionItem>({
 *   field: { prefix: 'select', value: props.value, disabled: props.disabled, error: props.error, helper: props.helper },
 *   listFactory: (c) => ({
 *     isDisabled: () => c.disabled.value,
 *     onClose: (reason) => { c.triggerValidation('blur'); emit('close', { reason }); },
 *     getBoundary: () => host.el,
 *     getItems: () => items,
 *     getPanel: () => dropdownEl,
 *     getReference: () => triggerEl,
 *   }),
 * });
 *
 * onCleanup(cleanup);
 */
export const createComposite = <T extends BaseOptionItem>(options: CompositeOptions<T>): CompositeControlHandle<T> => {
  const choice = createChoiceField(options.field);
  const listOptions = options.listFactory(choice);
  const optionList = createOptionList<T>(listOptions);

  return {
    choice,
    cleanup: optionList.cleanup,
    optionList,
  };
};
