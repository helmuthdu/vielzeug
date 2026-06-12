import { uuid } from '@vielzeug/arsenal';
import { computed, define, html, onMounted, prop, ref, signal } from '@vielzeug/craft';

import type { SwipeControl } from '../../headless';
import type { ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';

import { createSwipeControl } from '../../headless';
import { awaitExit } from '../../overlay/shared/await-exit';
import { reducedMotionMixin } from '../../styles';
import componentStyles from './toast.css?inline';

/** Toast container properties */

export type SgToastEvents = {
  add: { id: string };
  dismiss: { id: string };
};

export type SgToastProps = {
  max?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
};

/** Individual toast notification */
export type ToastItem = {
  actions?: Array<{
    color?: ThemeColor;
    label: string;
    onClick?: () => void;
    variant?: VisualVariant;
  }>;
  color?: ThemeColor;
  dismissible?: boolean;
  /** Auto-dismiss delay in ms. Set to 0 for persistent toasts (default: 5000) */
  duration?: number;
  heading?: string;
  /** Show message and actions side-by-side (horizontal layout) */
  horizontal?: boolean;
  /** Auto-generated via crypto.randomUUID() if omitted */
  id?: string;
  message: string;
  /** Metadata text (e.g. timestamp) shown in the alert meta slot */
  meta?: string;
  /** Called after the toast is fully dismissed and removed */
  onDismiss?: () => void;
  rounded?: RoundedSize | '';
  size?: ComponentSize;
  /**
   * Urgency level for screen readers.
   * - `'polite'` (default): uses `aria-live="polite"` — announced after the user finishes their current action.
   * - `'assertive'`: uses `aria-live="assertive"` — interrupts the user immediately. Use only for critical errors.
   */
  urgency?: 'polite' | 'assertive';
  variant?: 'solid' | 'flat' | 'bordered';
};

type NormalizedToast = ToastItem & { id: string };

/** Public API of the sg-toast element */
export interface ToastElement extends HTMLElement {
  add: (toast: ToastItem) => string;
  update: (id: string, updates: Partial<ToastItem>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

/**
 * An accessible toast stack with polite/assertive live regions and hover expansion.
 * Stacks up to 3 notifications with a 3D effect.
 *
 * @element sg-toast
 *
 * @attr {string} position - 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
 * @attr {number} max - Max toasts in DOM at once (default: 5)
 *
 * @fires add - When a toast is added `{ id }`
 * @fires dismiss - When a toast is dismissed `{ id }`
 *
 * @slot - Manually placed `sg-alert` elements
 *
 * @cssprop --toast-position - Position type (default: fixed)
 * @cssprop --toast-inset-top - Top inset
 * @cssprop --toast-inset-bottom - Bottom inset
 * @cssprop --toast-inset-left - Left inset
 * @cssprop --toast-inset-right - Right inset
 * @cssprop --toast-z-index - Z-index (default: 9999)
 * @cssprop --toast-max-width - Max width (default: 400px)
 * @cssprop --toast-gap - Gap between expanded toasts (default: 0.5rem)
 *
 * @example
 * ```html
 * <!-- Declarative: place once in HTML -->
 * <sg-toast position="bottom-right"></sg-toast>
 *
 * <!-- Programmatic: use the singleton service -->
 * <script type="module">
 *   import { toast } from '@vielzeug/sigil';
 *   toast.add({ message: 'Changes saved!', color: 'success' });
 * </script>
 * ```
 */
/** Renders the action buttons for a toast item. */
function renderToastActions(toast: NormalizedToast, onDismiss: () => void) {
  if (!toast.actions?.length) return '';

  return html`
    <div slot="actions" class="toast-actions">
      ${toast.actions.map(
        (action) => html`
          <sg-button
            size="sm"
            color=${action.color || toast.color || 'primary'}
            variant=${action.variant || 'solid'}
            @click=${() => {
              action.onClick?.();
              onDismiss();
            }}
            >${action.label}</sg-button
          >
        `,
      )}
    </div>
  `;
}

export const TOAST_TAG = 'sg-toast' as const;
define<SgToastProps, SgToastEvents>(TOAST_TAG, {
  props: {
    max: prop.number(5),
    position: prop.oneOf(
      ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const,
      'bottom-right',
    ),
  },
  setup(props, { bind: _bind, el, emit }) {
    const toasts = signal<NormalizedToast[]>([]);
    const exitingIds = signal<Set<string>>(new Set());
    const containerRef = ref<HTMLDivElement>();

    // Per-toast swipe-to-dismiss controls
    const swipeControls = new Map<string, SwipeControl>();

    const createToastSwipe = (id: string): SwipeControl =>
      createSwipeControl({
        axis: () => 'x',
        // Do not capture pointers for toast swipe gestures; capture can steal
        // close-button clicks inside sg-alert when the gesture does not move.
        captureTarget: () => null,
        disabled: () => !(toasts.value.find((t) => t.id === id)?.dismissible ?? true),
        onCancel: ({ event }) => {
          const wrapper = event.currentTarget as HTMLElement;

          wrapper.style.transition = '';
          wrapper.style.transform = '';
          wrapper.style.opacity = '';
        },
        onCommit: ({ distance, event }) => {
          const wrapper = event.currentTarget as HTMLElement;
          const dir = distance >= 0 ? 1 : -1;
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

          const finish = () => {
            wrapper.style.animation = 'none';
            removeToast(id);
          };

          if (reducedMotion) {
            wrapper.style.opacity = '0';
            finish();

            return;
          }

          wrapper.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
          void wrapper.offsetWidth;
          wrapper.style.transform = `translateX(${dir * 120}%)`;
          wrapper.style.opacity = '0';

          const onTransitionEnd = (e: TransitionEvent) => {
            if (e.target !== wrapper || e.propertyName !== 'transform') return;

            wrapper.removeEventListener('transitionend', onTransitionEnd);
            clearTimeout(fallback);
            finish();
          };

          const fallback = setTimeout(() => {
            wrapper.removeEventListener('transitionend', onTransitionEnd);
            finish();
          }, 300);

          wrapper.addEventListener('transitionend', onTransitionEnd);
        },
        onMove: ({ distance, event }) => {
          const wrapper = event.currentTarget as HTMLElement;

          wrapper.style.transition = 'none';
          wrapper.style.transform = `translateX(${distance}px)`;
          wrapper.style.opacity = String(Math.max(0, 1 - Math.abs(distance) / 200));
        },
      });

    // Timer tracking: maps id → { remaining, startedAt, timeoutId }
    const timers = new Map<string, { remaining: number; startedAt: number; timeoutId: number }>();

    // Sequentially dismiss queue — only one toast exits at a time so animations never overlap.
    const dismissQueue: string[] = [];
    let isDismissing = false;

    // Pause state: track focus and hover separately to resume only when both are clear
    let focusPaused = false;
    let hoverPaused = false;

    // ────────────────────────────────────────────────────────────────────────────────
    // Core State Mutations
    // ────────────────────────────────────────────────────────────────────────────────

    const setExiting = (id: string, value: boolean) => {
      const next = new Set(exitingIds.value);

      if (value) next.add(id);
      else next.delete(id);

      exitingIds.value = next;
    };

    // ────────────────────────────────────────────────────────────────────────────────
    // Timer Management (pause/resume for hover/focus)
    // ────────────────────────────────────────────────────────────────────────────────

    const pauseTimers = () => {
      for (const [id, t] of timers) {
        clearTimeout(t.timeoutId);
        timers.set(id, { ...t, remaining: Math.max(0, t.remaining - (Date.now() - t.startedAt)) });
      }
    };

    const resumeTimers = () => {
      for (const [id, t] of timers) {
        if (t.remaining <= 0) continue;

        const timeoutId = window.setTimeout(() => removeToast(id), t.remaining);

        timers.set(id, { ...t, remaining: t.remaining, timeoutId });
      }
    };

    const maybeUpdatePauseState = () => {
      if (focusPaused || hoverPaused) pauseTimers();
      else resumeTimers();
    };

    // ────────────────────────────────────────────────────────────────────────────────
    // Toast Lifecycle
    // ────────────────────────────────────────────────────────────────────────────────

    const scheduleRemoval = (id: string, duration: number) => {
      if (duration <= 0) return;

      const timeoutId = window.setTimeout(() => removeToast(id), duration);

      timers.set(id, { remaining: duration, startedAt: Date.now(), timeoutId });
    };

    const addToast = (toast: ToastItem): string => {
      const id = toast.id || uuid();
      const item: NormalizedToast = { dismissible: true, duration: 5000, ...toast, id };
      const maxToasts = props.max?.value ?? 5;

      // Create swipe control before updating signal so renderToastItem can find it.
      swipeControls.set(id, createToastSwipe(id));
      toasts.value = [...toasts.value, item].slice(-maxToasts);
      emit('add', { id });

      if (item.duration! > 0) scheduleRemoval(id, item.duration!);

      return id;
    };

    const removeToast = (id: string) => {
      // Already exiting or queued; skip to avoid double-processing
      if (exitingIds.value.has(id) || dismissQueue.includes(id)) return;

      if (isDismissing) {
        dismissQueue.push(id);

        return;
      }

      isDismissing = true;

      executeRemoval(id);
    };

    const executeRemoval = (id: string) => {
      // Guard: could have been removed since queue entry
      if (exitingIds.value.has(id)) {
        processNextInQueue();

        return;
      }

      const item = toasts.value.find((t) => t.id === id);
      const wrapper = containerRef.value?.querySelector<HTMLElement>(`[data-toast-id="${id}"]`);

      const finalize = () => {
        setExiting(id, false);
        toasts.value = toasts.value.filter((t) => t.id !== id);

        swipeControls.delete(id);

        // Clean up timer
        const timer = timers.get(id);

        if (timer) clearTimeout(timer.timeoutId);

        timers.delete(id);
        item?.onDismiss?.();
        emit('dismiss', { id });
        processNextInQueue();
      };

      if (wrapper) {
        setExiting(id, true);
        awaitExit(wrapper, finalize);
      } else {
        finalize();
      }
    };

    const processNextInQueue = () => {
      if (dismissQueue.length === 0) {
        isDismissing = false;

        return;
      }

      const nextId = dismissQueue.shift()!;

      executeRemoval(nextId);
    };
    const updateToast = (id: string, updates: Partial<ToastItem>) => {
      toasts.value = toasts.value.map((t) => (t.id === id ? { ...t, ...updates, id } : t));

      if (updates.duration === undefined) return;

      const timer = timers.get(id);

      if (timer) clearTimeout(timer.timeoutId);

      timers.delete(id);

      if (updates.duration > 0) scheduleRemoval(id, updates.duration);
    };
    const clearAll = () => {
      for (const [, t] of timers) clearTimeout(t.timeoutId);
      timers.clear();
      // Drain any pending queue entries and replace with the full current list so
      // they exit one-by-one in order.
      dismissQueue.length = 0;

      const ids = toasts.value.map((t) => t.id).filter((id) => !exitingIds.value.has(id));

      if (!ids.length) return;

      dismissQueue.push(...ids);

      if (!isDismissing) processNextInQueue();
    };

    const urgencyOf = (t: NormalizedToast) => t.urgency ?? (t.color === 'error' ? 'assertive' : 'polite');
    const politeToasts = computed(() => toasts.value.filter((t) => urgencyOf(t) === 'polite'));
    const assertiveToasts = computed(() => toasts.value.filter((t) => urgencyOf(t) === 'assertive'));

    const setHovered = (hovered: boolean) => {
      hoverPaused = hovered;
      el.classList.toggle('hovered', hovered);
      maybeUpdatePauseState();
    };
    const renderToastItem = (toast: NormalizedToast) => html`
      <div
        class="${() => (exitingIds.value.has(toast.id) ? 'toast-wrapper exiting' : 'toast-wrapper')}"
        data-toast-id=${toast.id}
        part="toast-wrapper"
        @pointerdown=${(e: PointerEvent) => swipeControls.get(toast.id)?.handlePointerDown(e)}
        @pointermove=${(e: PointerEvent) => swipeControls.get(toast.id)?.handlePointerMove(e)}
        @pointerup=${(e: PointerEvent) => swipeControls.get(toast.id)?.handlePointerUp(e)}
        @pointercancel=${(e: PointerEvent) => swipeControls.get(toast.id)?.handlePointerCancel(e)}>
        <sg-alert
          color=${toast.color || (toast.urgency === 'assertive' ? 'error' : 'primary')}
          variant=${toast.variant || 'solid'}
          size=${toast.size || 'md'}
          rounded=${toast.rounded || 'md'}
          ?dismissible=${toast.dismissible}
          ?horizontal=${toast.horizontal}
          heading=${toast.heading || ''}
          @dismiss=${() => removeToast(toast.id)}>
          ${toast.meta ? html`<span slot="meta">${toast.meta}</span>` : ''} ${toast.message}
          ${renderToastActions(toast, () => removeToast(toast.id))}
        </sg-alert>
      </div>
    `;

    onMounted(() => {
      const toastEl = el as ToastElement;

      toastEl.add = addToast;
      toastEl.update = updateToast;
      toastEl.dismiss = removeToast;
      toastEl.clear = clearAll;
    });

    return html`
      <div
        class="toast-container"
        ref=${containerRef}
        @pointerenter=${() => setHovered(true)}
        @pointerleave=${() => setHovered(false)}
        @focusin=${() => {
          focusPaused = true;
          maybeUpdatePauseState();
        }}
        @focusout=${() => {
          focusPaused = false;
          maybeUpdatePauseState();
        }}
        part="container">
        <!-- Polite live region: normal informational toasts -->
        <div
          role="region"
          aria-live="polite"
          aria-relevant="additions removals"
          aria-atomic="false"
          aria-label="Notifications"
          class="toast-live-region">
          ${() => politeToasts.value.map(renderToastItem)}
        </div>
        <!-- Assertive live region: critical errors that interrupt immediately -->
        <div
          role="region"
          aria-live="assertive"
          aria-relevant="additions removals"
          aria-atomic="false"
          aria-label="Critical notifications"
          class="toast-live-region">
          ${() => assertiveToasts.value.map(renderToastItem)}
        </div>
        <slot></slot>
      </div>
    `;
  },
  styles: [reducedMotionMixin, componentStyles],
});

// ─── Singleton toast service ─────────────────────────────────────────────────

const getHost = (): ToastElement => {
  let el = document.querySelector<ToastElement>('sg-toast');

  if (!el) {
    el = document.createElement('sg-toast') as ToastElement;
    document.body.appendChild(el);
  }

  return el;
};

/**
 * Singleton service for triggering toasts without direct DOM references.
 *
 * @example
 * ```ts
 * import { toast } from '@vielzeug/sigil';
 *
 * toast.add({ message: 'Saved!', color: 'success' });
 *
 * const id = toast.add({ message: 'Uploading…', duration: 0, dismissible: false });
 * toast.update(id, { message: 'Done!', color: 'success', duration: 3000, dismissible: true });
 *
 * await toast.promise(uploadFile(), {
 *   loading: 'Uploading…',
 *   success: (url) => `Uploaded to ${url}`,
 *   error: 'Upload failed',
 * });
 * ```
 */
export const toast = {
  /** Add a toast and return its id */
  add(item: ToastItem): string {
    return getHost().add(item);
  },

  /** Dismiss all toasts (animated) */
  clear(): void {
    getHost().clear();
  },
  /** Configure the auto-created container. Call before the first `add()` if the defaults need to change. */
  configure(config: SgToastProps): void {
    const el = getHost();

    if (config.position) el.setAttribute('position', config.position);

    if (config.max != null) el.setAttribute('max', String(config.max));
  },

  /**
   * Shows a loading toast tied to a promise.
   * Updates to success/error when the promise settles.
   */
  async promise<T>(
    promise: Promise<T>,
    messages: {
      error: string | ((err: unknown) => string);
      loading: string;
      success: string | ((data: T) => string);
    },
  ): Promise<T> {
    const id = toast.add({ color: 'primary', dismissible: false, duration: 0, message: messages.loading });

    try {
      const data = await promise;

      toast.update(id, {
        color: 'success',
        dismissible: true,
        duration: 5000,
        message: typeof messages.success === 'function' ? messages.success(data) : messages.success,
      });

      return data;
    } catch (err) {
      toast.update(id, {
        color: 'error',
        dismissible: true,
        duration: 5000,
        message: typeof messages.error === 'function' ? messages.error(err) : messages.error,
      });
      throw err;
    }
  },

  /** Dismiss a toast by id */
  remove(id: string): void {
    getHost().dismiss(id);
  },

  /** Update an existing toast in-place */
  update(id: string, updates: Partial<ToastItem>): void {
    getHost().update(id, updates);
  },
};
