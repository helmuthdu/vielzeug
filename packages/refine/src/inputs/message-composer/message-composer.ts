import { define, html, inject, prop, ref, bind, onCleanup, onElement, useEmit, useSlots } from '@vielzeug/ore';
import { live } from '@vielzeug/ore/directives';
import { useField } from '@vielzeug/ore/forms';
import { computed, watch } from '@vielzeug/ripple';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import {
  counterClassName,
  createAutoResize,
  createComposerControl,
  createTextField,
  lifecycleSignal,
  type SendShortcut,
} from '../../headless';
import {
  disablableBundle,
  loadableBundle,
  MESSAGE_COMPOSER_SIZE_PRESET,
  sizableBundle,
  themableBundle,
} from '../../shared';
import {
  colorThemeMixin,
  coarsePointerMixin,
  disabledLoadingMixin,
  forcedColorsFocusMixin,
  forcedColorsMixin,
  reducedMotionMixin,
  sizeVariantMixin,
} from '../../styles';
import { errorAttr } from '../shared/field-binding';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import '../../content/icon/icon';
import '../button/button';
import componentStyles from './message-composer.css?inline';

export type { SendShortcut } from '../../headless';

const DEFAULT_SEND_LABEL = 'Send message';
const SEND_ICON = 'arrow-up';

/** Events emitted by the message composer */
export type OreMessageComposerEvents = {
  /** Fired on every keystroke with the current value. */
  input: { originalEvent: Event; value: string };
  /**
   * Fired for a send attempt (the resolved `send-shortcut` or the send button) while the
   * composer isn't blank/disabled/loading. Cancelable — call `preventDefault()` to keep the
   * current text in the field instead of the default clear + refocus.
   */
  send: { originalEvent: KeyboardEvent | MouseEvent; value: string };
};

/** Message composer properties */
export type OreMessageComposerProps = {
  /** Clear the value and refocus after a non-cancelled `send` (default `true`) */
  'clear-on-send'?: boolean;
  /** Theme color (card focus ring + default send button color) */
  color?: ThemeColor;
  /** Disable the whole composer (field, slots, and send action) */
  disabled?: boolean;
  /** Error message shown below the field */
  error?: string;
  /** Stretch the composer to the full width of its container */
  fullwidth?: boolean;
  /** Helper text shown below the field */
  helper?: string;
  /** Accessible name for the field — never rendered visually, only as `aria-label` */
  label?: string;
  /** Blocks further sends (e.g. a send is already in flight) without disabling editing */
  loading?: boolean;
  /** Maximum character count; shows a counter */
  maxlength?: number;
  /** Form field name */
  name?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Make the field read-only */
  readonly?: boolean;
  /**
   * JS-only callback fired with the inner `<textarea>` element when it mounts, and with
   * `null` when it unmounts. Set as a JS property: `composer.ref = (el) => { ... }`.
   */
  ref?: ((el: HTMLTextAreaElement | null) => void) | null;
  /** Require a non-blank value for `<ore-form>` validation */
  required?: boolean;
  /** Number of visible rows before auto-resize grows the field */
  rows?: number;
  /** Lucide icon name for the default send button (default `'arrow-up'`) */
  'send-icon'?: string;
  /** Accessible label for the send button (default `'Send message'`) */
  'send-label'?: string;
  /** Keyboard shortcut that sends: 'enter' (Shift+Enter for a newline) or 'mod+enter' (Enter always inserts a newline; Ctrl/Cmd+Enter sends) */
  'send-shortcut'?: SendShortcut;
  /** Component size */
  size?: ComponentSize;
  /** Current text value */
  value?: string;
  /** Visual variant of the card — same variant set as `ore-textarea`, applied to the card. */
  variant?: Exclude<VisualVariant, 'frost' | 'text'>;
};

/**
 * A message/comment composer — a card with an auto-resizing field on top and a toolbar row
 * below it, built directly on the same headless primitives as `ore-textarea` (`createTextField`,
 * `createAutoResize`) rather than composing `ore-textarea` itself. Nesting a fully-styled sibling
 * component and suppressing most of its chrome (as an earlier version of this component did) is
 * a leaky composition — this owns its single `<textarea>` outright, so there's exactly one
 * implementation of the field's appearance to reason about, not two fighting each other.
 *
 * Handles the send gesture (Enter to send, Shift+Enter for a newline, or a Ctrl/Cmd+Enter
 * alternative), IME-safe composition, and clear-and-refocus after sending.
 *
 * @element ore-message-composer
 *
 * @attr {string} value - Current text value
 * @attr {string} placeholder - Placeholder text
 * @attr {string} label - Accessible name for the field (not rendered visually)
 * @attr {string} name - Form field name
 * @attr {string} helper - Helper text shown below the field
 * @attr {string} error - Error message shown below the field
 * @attr {boolean} disabled - Disable the whole composer
 * @attr {boolean} readonly - Read-only mode
 * @attr {boolean} required - Require a non-blank value for `<ore-form>` validation
 * @attr {boolean} loading - Blocks further sends without disabling editing
 * @attr {number} maxlength - Max character count; shows a counter
 * @attr {number} rows - Visible rows before auto-resize grows the field (default 1)
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual variant of the card: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost'
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {boolean} fullwidth - Stretch to the full width of the container
 * @attr {string} send-icon - Lucide icon name for the default send button (default 'arrow-up')
 * @attr {string} send-label - Accessible label for the send button (default 'Send message')
 * @attr {string} send-shortcut - 'enter' (default) | 'mod+enter'
 * @attr {boolean} clear-on-send - Clear the value and refocus after a non-cancelled send (default true)
 *
 * @fires input - Fired on every keystroke. detail: { value, originalEvent }
 * @fires send - Fired on a send attempt. Cancelable. detail: { value, originalEvent }
 *
 * @slot prefix - Content at the start of the toolbar row (e.g. an attach menu)
 * @slot suffix - Content at the end of the toolbar row, before the send button (e.g. a model picker)
 * @slot send - Replaces the default send button entirely — the only supported way to customize it
 *
 * @cssprop --message-composer-bg - Card background color
 * @cssprop --message-composer-border-color - Card border color
 * @cssprop --message-composer-radius - Card border radius
 * @cssprop --message-composer-padding - Card inner padding
 * @cssprop --message-composer-gap - Gap between the field/toolbar rows and between toolbar items
 * @cssprop --message-composer-placeholder-color - Field placeholder text color
 * @cssprop --message-composer-min-height - Minimum field height (default one line)
 * @cssprop --message-composer-hover-bg - Card background on hover (flat/ghost variants)
 * @cssprop --message-composer-hover-border-color - Card border on hover (flat/bordered variants)
 * @cssprop --message-composer-focus-bg - Card background when focused (flat variant)
 * @cssprop --message-composer-focus-border-color - Card border when focused (flat variant)
 *
 * @part composer - Root card container
 * @part field - The native `<textarea>` element
 * @part helper - Helper text element
 * @part error - Error text element (`role="alert"`)
 * @part toolbar - Toolbar row below the field
 * @part toolbar-start - Toolbar group holding the `prefix` slot
 * @part toolbar-end - Toolbar group holding the `suffix` slot and the send button
 * @part send-button - The default send button (absent when the `send` slot is used)
 *
 * @example
 * ```html
 * <ore-message-composer placeholder="Message…" send-shortcut="mod+enter"></ore-message-composer>
 * ```
 */
export const MESSAGE_COMPOSER_TAG = 'ore-message-composer' as const;
define<OreMessageComposerProps>(MESSAGE_COMPOSER_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    ...loadableBundle,
    'clear-on-send': prop.bool(true),
    error: prop.string(),
    fullwidth: prop.bool(false),
    helper: prop.string(),
    label: prop.string(),
    maxlength: prop.json(undefined as number | undefined),
    name: prop.string(),
    placeholder: prop.string(),
    readonly: prop.bool(false),
    ref: prop.json(undefined as ((el: HTMLTextAreaElement | null) => void) | null | undefined),
    required: prop.bool(false),
    rows: prop.json(undefined as number | undefined),
    'send-icon': prop.string(),
    'send-label': prop.string(),
    'send-shortcut': prop.oneOf(['enter', 'mod+enter'] as const, 'enter'),
    value: prop.string(),
    variant: prop.string<Exclude<VisualVariant, 'frost' | 'text'>>(),
  },
  setup(props) {
    const emit = useEmit<OreMessageComposerEvents>();
    const slots = useSlots<'prefix' | 'send' | 'suffix'>();

    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(props, formCtx);
    const isDisabled = fCtxProps.disabled;

    const abortSignal = lifecycleSignal(onCleanup);
    const textareaRef = ref<HTMLTextAreaElement>();
    const autoResize = createAutoResize();

    const tf = createTextField({
      disabled: isDisabled,
      error: props.error,
      helper: props.helper,
      maxLength: props.maxlength,
      onInput: (event, value) => emit('input', { originalEvent: event, value }),
      prefix: 'composer',
      readonly: props.readonly,
      required: props.required,
      signal: abortSignal,
      validateOn: formCtx?.validateOn,
      value: props.value,
    });

    // Directly form-associated now that the field is owned here rather than borrowed from a
    // nested `ore-textarea` (which previously registered with the ancestor `<form>` on this
    // component's behalf).
    tf.attachFormField(
      useField<string>({
        disabled: tf.disabled,
        onReset: () => {
          tf.reset();
          autoResize.recompute();
        },
        toFormValue: (v) => v,
        validationMessage: tf.validationMessage,
        validity: tf.validity,
        value: tf.value,
      }),
    );

    function attemptSend(event: KeyboardEvent | MouseEvent): void {
      const notPrevented = emit('send', { originalEvent: event, value: tf.value.value.trim() });

      // `preventDefault()` on `send` means "keep the current text — skip the default clear
      // + refocus" (see the event's own doc comment): both halves of that default are gated on
      // the same condition, not just the clear.
      if (notPrevented && props['clear-on-send'].value !== false) {
        tf.clear();
        autoResize.recompute();
        textareaRef.value?.focus();
      }
    }

    const composer = createComposerControl({
      disabled: isDisabled,
      loading: computed(() => Boolean(props.loading.value)),
      onSend: attemptSend,
      sendShortcut: props['send-shortcut'],
      value: tf.value,
    });

    onElement(textareaRef, (textareaEl) => {
      const unwireField = tf.wire(textareaEl);
      const unwireAutoResize = autoResize.wire(textareaEl);
      const handleKeydown = (e: KeyboardEvent) => composer.handleKeydown(e);

      textareaEl.addEventListener('keydown', handleKeydown);

      // Immediate fire for when the prop is already set on mount.
      props.ref.value?.(textareaEl);

      // Reactive watcher so that if props.ref is set *after* the inner <textarea> mounts
      // (e.g. a parent sets it via a ref callback after render), the new callback still
      // receives the live element.
      const refSub = watch(props.ref, (cb) => {
        cb?.(textareaEl);
      });

      return () => {
        textareaEl.removeEventListener('keydown', handleKeydown);
        unwireField();
        unwireAutoResize();
        refSub.dispose();
        props.ref.value?.(null);
      };
    });

    bind({
      attr: {
        error: errorAttr(tf.errorText),
        size: fCtxProps.size,
        variant: fCtxProps.variant,
      },
    });

    const counterClass = () => counterClassName(tf.counter?.value);
    const counterHidden = () => !tf.counter;
    const counterText = () => tf.counter?.value.counterText.replace(' / ', '/') ?? '';
    const helperHidden = () => !!tf.errorText.value || !tf.helperText.value;
    const errorHidden = () => !tf.errorText.value;

    return html`
      <div class="composer" part="composer">
        <textarea
          class="field"
          part="field"
          ref="${textareaRef}"
          :rows="${() => props.rows.value ?? 1}"
          :name="${() => props.name.value ?? ''}"
          :placeholder="${() => props.placeholder.value ?? 'Message…'}"
          :maxlength="${() => props.maxlength.value}"
          ?disabled="${isDisabled}"
          ?readonly="${() => Boolean(props.readonly.value)}"
          ?required="${() => Boolean(props.required.value)}"
          :value="${live(tf.value)}"
          :aria-label="${() => props.label.value || 'Message'}"
          :aria-keyshortcuts="${composer.keyShortcutsHint}"
          :aria-describedby="${tf.ariaDescribedBy}"
          :aria-errormessage="${tf.ariaErrorMessage}"
          :aria-invalid="${tf.ariaInvalid}"></textarea>
        <span class="${counterClass}" aria-live="polite" ?hidden="${counterHidden}">${counterText}</span>
        <div id="${tf.assistiveId}" class="helper-text" aria-live="polite" part="helper" ?hidden="${helperHidden}">
          ${() => tf.helperText.value}
        </div>
        <div id="${tf.errorId}" class="helper-text" role="alert" part="error" ?hidden="${errorHidden}">
          ${() => tf.errorText.value}
        </div>
        <div class="toolbar" part="toolbar">
          <div class="toolbar-start" part="toolbar-start">
            <slot name="prefix"></slot>
          </div>
          <div class="toolbar-end" part="toolbar-end">
            <slot name="suffix"></slot>
            <slot name="send"></slot>
            ${() =>
              slots.has('send').value
                ? ''
                : html`<ore-button
                    class="send-btn"
                    part="send-button"
                    type="button"
                    icon-only
                    variant="solid"
                    :color="${() => props.color.value || 'primary'}"
                    :size="${fCtxProps.size}"
                    :label="${() => props['send-label'].value || DEFAULT_SEND_LABEL}"
                    ?loading="${() => Boolean(props.loading.value)}"
                    ?disabled="${() => !composer.canSend.value}"
                    @click="${(e: MouseEvent) => composer.send(e)}">
                    <ore-icon name="${() => props['send-icon'].value || SEND_ICON}" size="16"></ore-icon>
                  </ore-button>`}
          </div>
        </div>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [
    colorThemeMixin,
    coarsePointerMixin,
    reducedMotionMixin,
    disabledLoadingMixin,
    forcedColorsMixin,
    forcedColorsFocusMixin('.field'),
    sizeVariantMixin(MESSAGE_COMPOSER_SIZE_PRESET),
    componentStyles,
  ],
});
