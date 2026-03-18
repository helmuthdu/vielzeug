import {
  computed,
  createId,
  define,
  handle,
  html,
  onMount,
  ref,
  watch,
  defineProps,
  defineEmits,
  defineSlots,
  fire,
} from '@vielzeug/craftit';

import { closeIcon } from '../../icons';
import { coarsePointerMixin, elevationMixin, forcedColorsMixin, reducedMotionMixin } from '../../styles';
import { lockBackground, unlockBackground } from '../../utils/background-lock';
import { useOverlay } from '../../utils/use-overlay';

type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom';
type DrawerSize = 'sm' | 'lg' | 'full';

import styles from './drawer.css?inline';

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
  /** Show the close (×) button in the header (default: true) */
  dismissible?: boolean;
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
 * @attr {boolean} dismissible - Show the close (×) button (default: true)
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
export const DRAWER_TAG = define(
  'bit-drawer',
  ({ host }) => {
    const props = defineProps<BitDrawerProps>({
      dismissible: { default: true },
      'initial-focus': { default: undefined },
      label: { default: undefined },
      open: { default: false },
      persistent: { default: false },
      placement: { default: 'right' },
      'return-focus': { default: true },
      size: { default: undefined },
      title: { default: undefined },
    });
    const emit = defineEmits<BitDrawerEvents>();
    const slots = defineSlots<{ default: unknown; footer: unknown; header: unknown }>();

    const drawerLabelId = createId('drawer-label');
    const dialogRef = ref<HTMLDialogElement>();
    const panelRef = ref<HTMLDivElement>();
    // Header is visible when there is slot content or a title prop.
    // The close button is independently positioned — always in the top-end corner of the panel.
    const hasHeader = computed(() => slots.has('header').value || !!props.title.value);
    const hasFooter = computed(() => slots.has('footer').value);
    const { applyInitialFocus, captureReturnFocus, closeWithAnimation, restoreFocus } = useOverlay(
      host,
      dialogRef,
      () => panelRef.value,
      props,
    );
    /**
     * Dispatches a cancellable `close-request` event. If not prevented, triggers the close animation.
     * Consumers can call `e.preventDefault()` to block closing (e.g. when there are unsaved changes).
     */
    const requestClose = (trigger: 'backdrop' | 'button' | 'escape') => {
      const allowed = fire(host, 'close-request', {
        cancelable: true,
        detail: { placement: props.placement.value ?? 'right', trigger },
      });

      if (allowed) closeWithAnimation();
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

      // Expose imperative API on the element instance.
      const el = host as DrawerElement;

      el.show = openDrawer;
      el.hide = closeWithAnimation;

      // Fires after every close (animation or programmatic). Syncs state and returns focus.
      const handleNativeClose = () => {
        unlockBackground();
        host.removeAttribute('open');
        restoreFocus();
        emit('close', { placement: props.placement.value ?? 'right' });
      };
      // Intercept Escape so the exit animation runs before dialog.close().
      const handleCancel = (e: Event) => {
        e.preventDefault();

        if (!props.persistent.value) requestClose('escape');
      };
      const handleBackdropClick = (e: MouseEvent) => {
        if (!props.persistent.value && e.target === dialog) requestClose('backdrop');
      };

      // { immediate: true } handles both the initial state and future changes.
      // Initial mount with open=false: closeWithAnimation() is a no-op since the dialog isn't open yet.
      watch(
        props.open,
        (isOpen) => {
          if (isOpen) openDrawer();
          else closeWithAnimation();
        },
        { immediate: true },
      );
      handle(dialog, 'close', handleNativeClose);
      handle(dialog, 'cancel', handleCancel);
      handle(dialog, 'click', handleBackdropClick);

      return () => {
        // Release the top-layer slot if the element is removed while open.
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
          </div>
          <button
            class="close-btn"
            part="close-btn"
            type="button"
            aria-label="Close"
            ?hidden=${() => !props.dismissible.value}
            @click="${() => requestClose('button')}">
            ${closeIcon}
          </button>
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
  {
    styles: [elevationMixin, forcedColorsMixin, coarsePointerMixin, reducedMotionMixin, styles],
  },
);
