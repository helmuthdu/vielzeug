import type { OverlayCloseDetail, OverlayCloseReason, OverlayOpenDetail } from '@vielzeug/craftit/controls';

import { define, computed, handle, html, onMount, ref, signal, watch, fire } from '@vielzeug/craftit';
import { createOverlayControl } from '@vielzeug/craftit/controls';

import type { PaddingSize, RoundedSize } from '../../types';

import '../../content/icon/icon';
import { type PropBundle } from '../../inputs/shared/bundles';
import { coarsePointerMixin, elevationMixin, roundedVariantMixin } from '../../styles';
import { lockBackground, unlockBackground } from '../../utils/background-lock';
import { useOverlay } from '../../utils/use-overlay';
import componentStyles from './dialog.css?inline';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type DialogBackdrop = 'opaque' | 'blur' | 'transparent';
type DialogElevation = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Dialog component properties */

export type BitDialogEvents = {
  close: OverlayCloseDetail;
  open: OverlayOpenDetail;
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
   * When true (default), the focus returns to the element that triggered the dialog after it closes.
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
 * @fires open - Fired when the dialog opens with detail: { reason }
 * @fires close - Fired when the dialog closes with detail: { reason }
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

/** Event schema for bit-dialog. */
const dialogProps = {
  backdrop: undefined,
  dismissible: false,
  elevation: undefined,
  'initial-focus': undefined,
  label: '',
  open: false,
  padding: undefined,
  persistent: false,
  'return-focus': true,
  rounded: undefined,
  size: 'md',
} satisfies PropBundle<BitDialogProps>;

export const DIALOG_TAG = define<BitDialogProps, BitDialogEvents>('bit-dialog', {
  props: dialogProps,
  setup({ emit, host, props, slots }) {
    const dialogRef = ref<HTMLDialogElement>();
    const isOpen = signal(false);
    const hasHeader = computed(() => slots.has('header').value || !!props.label.value || props.dismissible.value);
    const hasFooter = computed(() => slots.has('footer').value);
    let closeReason: OverlayCloseReason = 'programmatic';

    // ────────────────────────────────────────────────────────────────
    // Overlay State Management
    // ────────────────────────────────────────────────────────────────

    const { applyInitialFocus, captureReturnFocus, closeWithAnimation, restoreFocus } = useOverlay(
      host.el,
      dialogRef,
      () => dialogRef.value?.querySelector<HTMLElement>('.panel'),
      props,
    );

    const overlay = createOverlayControl({
      elements: {
        boundary: host.el,
        panel: dialogRef.value?.querySelector<HTMLElement>('.panel') ?? null,
      },
      isOpen,
      onOpen: (reason) => emit('open', { reason }),
      setOpen: (next, reason) => {
        const dialog = dialogRef.value;

        if (!dialog) return;

        if (next) {
          if (dialog.open) return;

          captureReturnFocus();
          dialog.showModal();
          applyInitialFocus();
          lockBackground(host.el);
          isOpen.value = true;

          return;
        }

        if (dialog.open) {
          closeReason = reason as OverlayCloseReason;
          closeWithAnimation();

          return;
        }

        isOpen.value = false;
      },
    });

    // ────────────────────────────────────────────────────────────────
    // Lifecycle: Setup Native Dialog Integration
    // ────────────────────────────────────────────────────────────────

    onMount(() => {
      const dialog = dialogRef.value;

      if (!dialog) return;

      // Sync prop changes → native dialog
      watch(
        props.open,
        (open) => {
          if (open) {
            overlay.open('programmatic');

            return;
          }

          overlay.close('programmatic', false);
        },
        { immediate: true },
      );

      // ────────────────────────────────────────────────────────────
      // Event Handlers: Close, Escape, Backdrop Click
      // ────────────────────────────────────────────────────────────

      const handleNativeClose = () => {
        unlockBackground();
        host.el.removeAttribute('open');
        isOpen.value = false;
        restoreFocus();
        emit('close', { reason: closeReason });
        closeReason = 'programmatic';
      };

      const requestClose = (reason: Exclude<OverlayCloseReason, 'programmatic'>) => {
        const closeAllowed = fire.custom(host.el, 'close-request', {
          cancelable: true,
          detail: { reason },
        });

        if (!closeAllowed) return;

        closeReason = reason;
        overlay.close(reason, false);
      };

      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !props.persistent.value) {
          e.preventDefault();
          requestClose('escape');
        }
      };

      const handleBackdropClick = (e: MouseEvent) => {
        if (props.persistent.value) return;

        // Click target is the <dialog> element itself (not the panel)
        if (e.target === dialog) {
          requestClose('outside-click');
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

      const closeAllowed = fire.custom(host.el, 'close-request', {
        cancelable: true,
        detail: { reason: 'trigger' },
      });

      if (!closeAllowed) return;

      closeReason = 'trigger';
      overlay.close('trigger', false);
    };

    return html`
      <dialog
        ref=${dialogRef}
        class="dialog"
        part="dialog"
        :aria-label="${() => props.label.value || null}"
        aria-modal="true">
        <div class="overlay" part="overlay" aria-hidden="true"></div>
        <div class="panel" part="panel" :data-size="${props.size.value}">
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
              <bit-icon name="x" size="16" stroke-width="2.5" aria-hidden="true"></bit-icon>
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
    `;
  },
  styles: [elevationMixin, roundedVariantMixin, coarsePointerMixin, componentStyles],
});
