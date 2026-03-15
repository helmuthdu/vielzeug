import {
  computed,
  define,
  defineEmits,
  defineProps,
  defineSlots,
  handle,
  html,
  onMount,
  ref,
  watch,
} from '@vielzeug/craftit';

import type { PaddingSize, RoundedSize } from '../../types';

import { closeIcon } from '../../icons';
import { coarsePointerMixin, elevationMixin, reducedMotionMixin, roundedVariantMixin } from '../../styles';
import { awaitExit } from '../../utils/animation';
import { lockBackground, unlockBackground } from '../../utils/background-lock';
import { useOverlay } from '../../utils/use-overlay';
import componentStyles from './dialog.css?inline';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type DialogBackdrop = 'opaque' | 'blur' | 'transparent';
type DialogElevation = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Dialog component properties */

export type BitDialogEvents = {
  close: undefined;
  open: undefined;
};

export type BitDialogProps = {
  /** Backdrop style — 'blur' (default): dark overlay + blur; 'opaque': dark overlay only; 'transparent': no overlay */
  backdrop?: DialogBackdrop;
  /** Show a close (×) button in the header */
  dismissible?: boolean;
  /** Panel shadow elevation — defaults to 'xl' */
  elevation?: DialogElevation;
  /**
   * CSS selector for the element inside the dialog that should receive focus when the dialog opens.
   * Defaults to the first focusable element (browser default).
   * @example 'input[name="email"]' | '#confirm-btn'
   */
  'initial-focus'?: string;
  /** Dialog title shown in the header (used as aria-label when no header slot) */
  label?: string;
  /** Controls the open state of the dialog */
  open?: boolean;
  /** Internal padding size */
  padding?: PaddingSize;
  /** When true, clicking the backdrop does not close the dialog */
  persistent?: boolean;
  /**
   * When true (default), focus returns to the element that triggered the dialog after it closes.
   * Set to false if you want to manage focus manually.
   */
  'return-focus'?: boolean;
  /** Border radius */
  rounded?: RoundedSize | '';
  /** Dialog size */
  size?: DialogSize;
};

/**
 * A modal dialog that traps focus, blocks page interaction, and dismisses on
 * `Escape`. Built on the native `<dialog>` element for correct top-layer stacking
 * and browser-managed accessibility.
 *
 * @element bit-dialog
 *
 * @attr {boolean} open - Open/close the dialog
 * @attr {string} label - Dialog title (also used as aria-label)
 * @attr {string} size - Size: 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @attr {boolean} dismissible - Show a close (×) button in the header
 * @attr {boolean} persistent - Prevent backdrop-click from closing
 * @attr {string} rounded - Border radius size
 * @attr {string} backdrop - Backdrop style: 'opaque' (default) | 'blur' | 'transparent'
 * @attr {string} elevation - Panel shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 * @attr {string} padding - Padding: 'none' | 'sm' | 'md' | 'lg' | 'xl'
 *
 * @fires open - Fired when the dialog opens
 * @fires close - Fired when the dialog closes (any trigger)
 *
 * @slot - Dialog body content
 * @slot header - Custom header content (replaces the default title + close layout)
 * @slot footer - Action buttons or additional content at the bottom
 *
 * @cssprop --dialog-bg - Panel background color
 * @cssprop --dialog-border-color - Panel border color
 * @cssprop --dialog-radius - Panel border radius
 * @cssprop --dialog-shadow - Panel drop shadow
 * @cssprop --dialog-padding - Padding for header, body, and footer sections
 * @cssprop --dialog-gap - Gap between footer action buttons
 * @cssprop --dialog-backdrop - Backdrop overlay color
 * @cssprop --dialog-max-width - Maximum panel width (overridden by size prop)
 *
 * @example
 * ```html
 * <bit-dialog label="Confirm action" dismissible>
 *   <p>Are you sure you want to delete this item?</p>
 *   <div slot="footer">
 *     <bit-button variant="ghost" id="cancel">Cancel</bit-button>
 *     <bit-button color="error" id="confirm">Delete</bit-button>
 *   </div>
 * </bit-dialog>
 *
 * <script type="module">
 *   import '@vielzeug/buildit/dialog';
 *   const dialog = document.querySelector('bit-dialog');
 *   document.querySelector('#open-btn').addEventListener('click', () => {
 *     dialog.setAttribute('open', '');
 *   });
 *   document.querySelector('#cancel').addEventListener('click', () => {
 *     dialog.removeAttribute('open');
 *   });
 * </script>
 * ```
 */
export const DIALOG_TAG = define('bit-dialog', ({ host }) => {
  const props = defineProps<BitDialogProps>({
    backdrop: { default: undefined },
    dismissible: { default: false },
    elevation: { default: undefined },
    'initial-focus': { default: undefined },
    label: { default: '' },
    open: { default: false },
    padding: { default: undefined },
    persistent: { default: false },
    'return-focus': { default: true },
    rounded: { default: undefined },
    size: { default: 'md' },
  });

  const emit = defineEmits<BitDialogEvents>();

  const slots = defineSlots<{ default: unknown; footer: unknown; header: unknown }>();

  const dialogRef = ref<HTMLDialogElement>();

  const hasHeader = computed(() => slots.has('header').value || !!props.label.value || props.dismissible.value);
  const hasFooter = computed(() => slots.has('footer').value);

  const { applyInitialFocus, captureReturnFocus, closeWithAnimation, restoreFocus } = useOverlay(
    host,
    dialogRef,
    () => dialogRef.value?.querySelector<HTMLElement>('.panel'),
    props,
  );

  onMount(() => {
    const dialog = dialogRef.value;

    if (!dialog) return;

    // Sync prop changes → native dialog
    watch(props.open, (open) => {
      if (open) {
        if (!dialog.open) {
          captureReturnFocus();
          dialog.showModal();
          applyInitialFocus();
          lockBackground(host);
          emit('open');
        }
      } else {
        closeWithAnimation();
      }
    });

    // Native dialog 'close' fires after animation finishes or on programmatic .close()
    const handleNativeClose = () => {
      unlockBackground();
      // Sync the open prop back to the host attribute if closed externally
      host.removeAttribute('open');

      // Return focus to the triggering element unless opted out
      restoreFocus();

      emit('close');
    };

    // Intercept Escape to play exit animation first; also enforce persistent mode
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();

        if (!props.persistent.value) {
          closeWithAnimation();
        }
      }
    };

    // Backdrop click: the click target is the <dialog> element itself (not the panel)
    const handleBackdropClick = (e: MouseEvent) => {
      if (props.persistent.value) return;

      // When clicking the backdrop, the event target is the <dialog> element itself.
      // Clicks inside the panel bubble up with a more specific target.
      if (e.target === dialog) {
        closeWithAnimation();
      }
    };

    handle(dialog, 'close', handleNativeClose);
    handle(dialog, 'click', handleBackdropClick);
    handle(dialog, 'keydown', handleKeydown);

    return () => {
      // Ensure the native dialog is closed on unmount to release top-layer
      if (dialog.open) dialog.close();

      unlockBackground();
    };
  });

  const handleDismiss = () => {
    const dialog = dialogRef.value;

    if (!dialog) return;

    const event = new Event('close-request');

    dialog.dispatchEvent(event);
    dialog.classList.add('closing');

    const panel = dialog.querySelector<HTMLElement>('.panel');
    const finish = () => {
      dialog.classList.remove('closing');
      dialog.close();
    };

    if (panel) {
      awaitExit(panel, finish, 'transition');
    } else {
      finish();
    }
  };

  return {
    styles: [elevationMixin, roundedVariantMixin, coarsePointerMixin, reducedMotionMixin, componentStyles],
    template: html`
      <dialog
        ref=${dialogRef}
        class="dialog"
        part="dialog"
        :aria-label="${() => props.label.value || null}"
        aria-modal="true">
        <div class="overlay" part="overlay" aria-hidden="true"></div>
        <div class="panel" part="panel" :data-size="${props.size}">
          <div class="header" part="header" ?hidden=${() => !hasHeader.value}>
            <slot name="header">
              <span class="title" part="title">${() => props.label.value}</span>
            </slot>
            <button
              class="close"
              part="close"
              type="button"
              aria-label="Close dialog"
              ?hidden=${() => !props.dismissible.value}
              @click=${handleDismiss}>
              ${closeIcon}
            </button>
          </div>
          <div class="body" part="body">
            <slot></slot>
          </div>
          <div class="footer" part="footer" ?hidden=${() => !hasFooter.value}>
            <slot name="footer"></slot>
          </div>
        </div>
      </dialog>
    `,
  };
});
