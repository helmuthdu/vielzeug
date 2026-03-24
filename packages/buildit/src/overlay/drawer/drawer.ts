import { computed, createId, defineComponent, fire, handle, html, onMount, ref, watch } from '@vielzeug/craftit';

import { closeIcon } from '../../icons';
import { coarsePointerMixin, elevationMixin, forcedColorsMixin, reducedMotionMixin } from '../../styles';
import { lockBackground, unlockBackground, useOverlay } from '../../utils';
import styles from './drawer.css?inline';

type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom';
type DrawerSize = 'sm' | 'lg' | 'full';
type DrawerBackdrop = 'opaque' | 'blur' | 'transparent';

/** Element interface exposing the imperative API for `bit-drawer`. */
export interface DrawerElement extends HTMLElement, Omit<BitDrawerProps, 'title'> {
  /** Programmatically open the drawer. Equivalent to setting `open`. */
  show(): void;
  /** Programmatically close the drawer with the exit animation. */
  hide(): void;
}

/** Drawer component properties */

export type BitDrawerEvents = {
  close: { placement: DrawerPlacement };
  open: { placement: DrawerPlacement };
};

export type BitDrawerProps = {
  /** Backdrop style — 'opaque' (default), 'blur', or 'transparent' */
  backdrop?: DrawerBackdrop;
  /** Show the close (×) button in the header (default: true) */
  dismissable?: boolean;
  /**
   * CSS selector for the element inside the drawer that should receive focus on open.
   * Defaults to native dialog focus management (first focusable element).
   * @example '#submit-btn' | 'input[name="email"]'
   */
  'initial-focus'?: string;
  /**
   * Invisible accessible label for the dialog (`aria-label`).
   * Use when the drawer has no visible title (e.g. image-only content).
   * When omitted, `aria-labelledby` points to the visible header title instead.
   */
  label?: string;
  /** Controlled open state */
  open?: boolean;
  /** When true, backdrop clicks do not close the drawer (default: false) */
  persistent?: boolean;
  /** Side from which the drawer slides in */
  placement?: DrawerPlacement;
  /**
   * When true (default), focus returns to the triggering element after the drawer closes.
   * Set to false to manage focus manually.
   */
  'return-focus'?: boolean;
  /** Drawer width/height preset */
  size?: DrawerSize;
  /**
   * Visible title text rendered inside the header.
   * Used as the dialog's accessible label via `aria-labelledby` when `label` is not set.
   */
  title?: string;
};

/**
 * A panel that slides in from any edge of the screen, built on the native `<dialog>` element.
 *
 * @element bit-drawer
 *
 * @attr {boolean} open - Controlled open/close state
 * @attr {string} placement - 'left' | 'right' (default) | 'top' | 'bottom'
 * @attr {string} size - 'sm' | 'lg' | 'full'
 * @attr {string} title - Visible header title text
 * @attr {string} label - Invisible aria-label (for drawers without a visible title)
 * @attr {boolean} dismissable - Show the close (×) button (default: true)
 * @attr {string} backdrop - Backdrop style: 'opaque' (default) | 'blur' | 'transparent'
 * @attr {boolean} persistent - Prevent backdrop-click from closing (default: false)
 *
 * @slot header - Drawer header content
 * @slot - Main body content
 * @slot footer - Drawer footer content
 *
 * @fires open - When the drawer opens
 * @fires close - When the drawer closes
 *
 * @cssprop --drawer-backdrop - Backdrop background
 * @cssprop --drawer-bg - Panel background color
 * @cssprop --drawer-size - Panel width (horizontal) or height (vertical)
 * @cssprop --drawer-shadow - Panel box-shadow
 *
 * @example
 * ```html
 * <!-- With visible title -->
 * <bit-drawer open title="Settings" placement="right">
 *   <p>Settings content here.</p>
 * </bit-drawer>
 *
 * <!-- With custom header slot -->
 * <bit-drawer open placement="right">
 *   <span slot="header">Settings</span>
 *   <p>Settings content here.</p>
 * </bit-drawer>
 * ```
 */
export const DRAWER_TAG = defineComponent<BitDrawerProps, BitDrawerEvents>({
  props: {
    backdrop: { default: undefined },
    dismissable: { default: true },
    'initial-focus': { default: undefined },
    label: { default: undefined },
    open: { default: false },
    persistent: { default: false },
    placement: { default: 'right' },
    'return-focus': { default: true },
    size: { default: undefined },
    title: { default: undefined },
  },
  setup({ emit, host, props, slots }) {
    const drawerLabelId = createId('drawer-label');
    const dialogRef = ref<HTMLDialogElement>();
    const panelRef = ref<HTMLDivElement>();

    // Header is visible when there is slot content, a title prop, or a close button.
    const hasHeader = computed(() => slots.has('header').value || !!props.title.value || props.dismissable.value);
    const hasFooter = computed(() => slots.has('footer').value);

    const { applyInitialFocus, captureReturnFocus, restoreFocus } = useOverlay(
      host,
      dialogRef,
      () => panelRef.value,
      props,
    );

    const close = () => {
      const dialog = dialogRef.value;

      if (!dialog?.open) return;

      dialog.close();
    };

    const requestClose = (trigger: 'backdrop' | 'button' | 'escape') => {
      const allowed = fire.custom(host, 'close-request', {
        cancelable: true,
        detail: { placement: props.placement.value ?? 'right', trigger },
      });

      if (allowed) close();
    };

    const openDrawer = () => {
      const dialog = dialogRef.value;

      if (!dialog || dialog.open) return;

      captureReturnFocus();
      dialog.showModal();
      lockBackground(host);

      applyInitialFocus();
      emit('open', { placement: props.placement.value ?? 'right' });
    };

    onMount(() => {
      const dialog = dialogRef.value;

      if (!dialog) return;

      // Expose imperative API
      const el = host as DrawerElement;

      el.show = openDrawer;
      el.hide = close;

      const handleNativeClose = () => {
        unlockBackground();
        host.removeAttribute('open');
        restoreFocus();
        emit('close', { placement: props.placement.value ?? 'right' });
      };

      const handleCancel = (e: Event) => {
        e.preventDefault();

        if (!props.persistent.value) requestClose('escape');
      };

      const handleBackdropClick = (e: MouseEvent) => {
        if (!props.persistent.value && e.target === dialog) requestClose('backdrop');
      };

      watch(
        props.open,
        (isOpen) => {
          if (isOpen) openDrawer();
          else close();
        },
        { immediate: true },
      );

      handle(dialog, 'close', handleNativeClose);
      handle(dialog, 'cancel', handleCancel);
      handle(dialog, 'click', handleBackdropClick);

      return () => {
        if (dialog.open) {
          unlockBackground();
          dialog.close();
        }
      };
    });

    return html`
      <dialog
        ref=${dialogRef}
        aria-modal="true"
        :aria-label="${() => props.label.value ?? null}"
        :aria-labelledby="${() => (!props.label.value ? drawerLabelId : null)}">
        <div class="panel" part="panel" ref=${panelRef}>
          <div class="header" part="header" ?hidden=${() => !hasHeader.value}>
            <span class="header-title" id="${drawerLabelId}">
              <slot name="header">${() => props.title.value ?? ''}</slot>
            </span>
            <button
              class="close-btn"
              part="close-btn"
              type="button"
              aria-label="Close"
              ?hidden=${() => !props.dismissable.value}
              @click="${() => requestClose('button')}">
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
    `;
  },
  styles: [elevationMixin, forcedColorsMixin, coarsePointerMixin, reducedMotionMixin, styles],
  tag: 'bit-drawer',
});
