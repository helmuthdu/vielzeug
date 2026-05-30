import { define, html, prop, ref, onMounted } from '@vielzeug/craft';

import type { OverlayCloseDetail, OverlayOpenDetail } from '../../headless';
import type { PaddingSize, RoundedSize } from '../../types';

import { coarsePointerMixin, elevationMixin, roundedVariantMixin } from '../../styles';
import { useDialogControl } from '../shared/use-dialog';
import '../../content/icon/icon';
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
 * @part dialog - Dialog root container.
 * @part overlay - Overlay backdrop element.
 * @part panel - Panel container.
 * @part header - Header container.
 * @part title - Title text element.
 * @part close - Close action control.
 * @part body - Body content container.
 * @part footer - Footer container.
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
 *   import '@vielzeug/sigil/dialog';
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

export const DIALOG_TAG = define<BitDialogProps, BitDialogEvents>('bit-dialog', {
  props: {
    backdrop: prop.string<DialogBackdrop>(),
    dismissible: prop.bool(false),
    elevation: prop.string<DialogElevation>(),
    'initial-focus': prop.string(),
    label: prop.string(),
    open: prop.bool(false),
    padding: prop.string<PaddingSize>(),
    persistent: prop.bool(false),
    'return-focus': prop.bool(true),
    rounded: prop.string<RoundedSize | ''>(),
    size: prop.oneOf(['sm', 'md', 'lg', 'xl', 'full'] as const, 'md'),
  },
  setup(props, { bind: _bind, el, emit, slots }) {
    const dialogRef = ref<HTMLDialogElement>();
    const hasHeader = () => slots.has('header').value || !!props.label.value || props.dismissible.value;
    const hasFooter = () => slots.has('footer').value;

    const { closeWithAnimation, overlay, requestClose, setupNativeListeners } = useDialogControl({
      dialogRef,
      getPanelEl: () => dialogRef.value?.querySelector<HTMLElement>('.panel'),
      host: el,
      initialFocus: props['initial-focus'],
      isPersistent: () => Boolean(props.persistent.value),
      onNativeClose: (reason) => emit('close', { reason }),
      onOpen: (reason) => emit('open', { reason }),
      openProp: props.open,
      performClose: () => {
        closeWithAnimation();
      },
      returnFocus: props['return-focus'],
    });

    const handleDismiss = () => {
      requestClose('trigger');
    };

    onMounted(() => {
      const dialog = dialogRef.value;

      if (!dialog) return;

      setupNativeListeners();

      return () => {
        overlay.cleanup();
      };
    });

    return html`
      <dialog ref=${dialogRef} class="dialog" part="dialog" aria-label="${props.label}" aria-modal="true">
        <div class="overlay" part="overlay" aria-hidden="true"></div>
        <div class="panel" part="panel" :data-size="${props.size}">
          <div class="header" part="header" ?hidden=${() => !hasHeader()}>
            <slot name="header">
              <span class="title" part="title">${props.label}</span>
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
          <div class="footer" part="footer" ?hidden=${() => !hasFooter()}>
            <slot name="footer"></slot>
          </div>
        </div>
      </dialog>
    `;
  },
  styles: [elevationMixin, roundedVariantMixin, coarsePointerMixin, componentStyles],
});
