import { uuid } from '@vielzeug/arsenal';
import { define, html, prop, ref } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';

import type { SwipeControl } from '../../headless';
import type { ComponentSize, RoundedSize, ThemeColor } from '../../types';

import { warn } from '../../_dev';
import { createSwipeControl } from '../../headless';
import { reducedMotionMixin } from '../../styles';
import componentStyles from './toast.css?inline';

// ---------------------------------------------------------------------------
// NOTE: Architecture
//
// Each toast has two DOM layers:
//   .toast-wrapper  — layout / stacking / grid positioning (no animation)
//   .toast-inner    — animation target (opacity fade in/out)
//
// This separation means stacking rules (nth-last-child, hover) and animation
// rules never fight over the same element. No !important needed anywhere.
//
// State: a single signal<ToastEntry[]> owns all per-toast state (data, phase,
// timer). There are no parallel Sets or Maps tracking lifecycle separately.
//
// Exit animation: .toast-inner.exiting fades opacity → 0.
// The wrapper stays in-flow during the fade so the grid doesn't snap shut.
// After transitionend (or TOAST_EXIT_MS fallback), finalize() removes the
// toast from the entries array which removes the wrapper from the DOM.
//
// Swipe gesture animates .toast-inner (not .toast-wrapper) to avoid
// polluting the wrapper's transition state used by the exit animation.
// Swipe commit calls finalizeRemoval() directly — it owns the animation,
// so the normal removeToast() path is not involved.
//
// Close button: owned by the toast template, not ore-alert. ore-alert renders
// content only. This keeps ore-alert a pure presentational component with no
// animation lifecycle coupling.
//
// Max eviction: when adding would exceed max, oldest non-exiting toasts are
// dismissed via removeToast() — animated, with onDismiss callback + event.
//
// Dismiss queue: removed. Each toast exits independently in parallel.
// ---------------------------------------------------------------------------

/** Duration (ms) of the CSS opacity exit transition on .toast-inner.
 * Must match the value in toast.css: `transition: opacity 300ms`.  */
const TOAST_EXIT_MS = 300;

// ─── Types ───────────────────────────────────────────────────────────────────

export type OreToastEvents = {
  add: { id: string };
  dismiss: { id: string };
};

export type OreToastProps = {
  max?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
};

/** Individual toast notification */
export type ToastItem = {
  actions?: Array<{
    color?: ThemeColor;
    label: string;
    onClick?: () => void;
    variant?: 'solid' | 'flat' | 'bordered';
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
   * - `'polite'` (default): announced after the user finishes their current action.
   * - `'assertive'`: interrupts the user immediately. Use only for critical errors.
   */
  urgency?: 'polite' | 'assertive';
  variant?: 'solid' | 'flat' | 'bordered';
};

type ToastPhase = 'entering' | 'active' | 'exiting';

type ToastTimer = {
  remaining: number;
  startedAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
};

/** Internal: a ToastItem that has been normalized and given a lifecycle phase. */
type ToastEntry = Required<Pick<ToastItem, 'dismissible' | 'duration' | 'id'>> &
  Omit<ToastItem, 'dismissible' | 'duration' | 'id'> & {
    id: string;
    phase: ToastPhase;
    timer: ToastTimer | null;
  };

/** Public API of the ore-toast element */
export interface ToastElement extends HTMLElement {
  add: (toast: ToastItem) => string;
  clear: () => void;
  dismiss: (id: string) => void;
  update: (id: string, updates: Partial<ToastItem>) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * An accessible toast stack with polite/assertive live regions and hover expansion.
 * Stacks up to 3 notifications with a 3D effect.
 *
 * @element ore-toast
 *
 * @attr {string} position - 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
 * @attr {number} max - Max toasts in DOM at once (default: 5)
 *
 * @fires add - When a toast is added `{ id }`
 * @fires dismiss - When a toast is dismissed `{ id }`
 *
 * @slot - Manually placed `ore-alert` elements
 *
 * @cssprop --toast-position - Position type (default: fixed)
 * @cssprop --toast-inset-top - Top inset
 * @cssprop --toast-inset-bottom - Bottom inset
 * @cssprop --toast-inset-left - Left inset
 * @cssprop --toast-inset-right - Right inset
 * @cssprop --toast-z-index - Z-index (default: 9999)
 * @cssprop --toast-max-width - Max width (default: 400px)
 * @cssprop --toast-gap - Gap between expanded toasts (default: 0.5rem)
 * @cssprop --toast-exit-duration - Exit animation duration (default: 300ms)
 *
 * @example
 * ```html
 * <!-- Declarative: place once in HTML -->
 * <ore-toast position="bottom-right"></ore-toast>
 *
 * <!-- Programmatic: use the singleton service -->
 * <script type="module">
 *   import { toast } from '@vielzeug/refine';
 *   toast.success('Changes saved!');
 * </script>
 * ```
 */

/** Renders the action buttons for a toast entry. */
function renderToastActions(entry: ToastEntry, onDismiss: () => void) {
  if (!entry.actions?.length) return '';

  return html`
    <div slot="actions" class="toast-actions">
      ${entry.actions.map(
        (action) => html`
          <ore-button
            size="sm"
            color=${action.color || entry.color || 'primary'}
            variant=${action.variant || 'solid'}
            @click=${() => {
              action.onClick?.();
              onDismiss();
            }}
            >${action.label}</ore-button
          >
        `,
      )}
    </div>
  `;
}

export const TOAST_TAG = 'ore-toast' as const;
define<OreToastProps, OreToastEvents>(TOAST_TAG, {
  props: {
    max: prop.number(5),
    position: prop.oneOf(
      ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const,
      'bottom-right',
    ),
  },
  setup(props, { el, emit, onCleanup, onMounted }) {
    // Single source of truth for all toast state.
    const entries = signal<ToastEntry[]>([]);
    const containerRef = ref<HTMLDivElement>();

    // Per-toast swipe-to-dismiss controls (keyed by id, cleaned up in finalizeRemoval).
    const swipeControls = new Map<string, SwipeControl>();

    // Pause state is reactive so computed derivations and watches can observe it.
    const hoverPaused = signal(false);
    const focusPaused = signal(false);
    const paused = computed(() => hoverPaused.value || focusPaused.value);

    // ── Helpers ────────────────────────────────────────────────────────────

    const updateEntry = (id: string, patch: Partial<ToastEntry>) => {
      entries.value = entries.value.map((e) => (e.id === id ? { ...e, ...patch } : e));
    };

    const getEntry = (id: string) => entries.value.find((e) => e.id === id);

    const getInner = (wrapperOrEvent: HTMLElement | Event): HTMLElement | null => {
      const wrapper = wrapperOrEvent instanceof Event ? (wrapperOrEvent.currentTarget as HTMLElement) : wrapperOrEvent;

      return wrapper.querySelector<HTMLElement>('.toast-inner');
    };

    // ── Timer management ───────────────────────────────────────────────────

    const clearEntryTimer = (entry: ToastEntry): ToastEntry => {
      if (entry.timer) clearTimeout(entry.timer.timeoutId);

      return { ...entry, timer: null };
    };

    const scheduleTimer = (id: string, remaining: number) => {
      if (remaining <= 0) return;

      const timeoutId = setTimeout(() => removeToast(id), remaining);

      updateEntry(id, { timer: { remaining, startedAt: Date.now(), timeoutId } });
    };

    const pauseTimers = () => {
      entries.value = entries.value.map((e) => {
        if (!e.timer) return e;

        clearTimeout(e.timer.timeoutId);

        return {
          ...e,
          timer: { ...e.timer, remaining: Math.max(0, e.timer.remaining - (Date.now() - e.timer.startedAt)) },
        };
      });
    };

    const resumeTimers = () => {
      for (const e of entries.value) {
        if (!e.timer || e.timer.remaining <= 0) continue;

        const timeoutId = setTimeout(() => removeToast(e.id), e.timer.remaining);

        updateEntry(e.id, { timer: { ...e.timer, startedAt: Date.now(), timeoutId } });
      }
    };

    // Watch reactive pause state — automatically pauses/resumes all timers.
    watch(paused, (isPaused) => {
      if (isPaused) pauseTimers();
      else resumeTimers();
    });

    // ── Swipe gesture ──────────────────────────────────────────────────────
    // Animates .toast-inner to avoid polluting the wrapper transition state.
    // On commit, calls finalizeRemoval() directly (swipe owns the animation).

    const createToastSwipe = (id: string): SwipeControl =>
      createSwipeControl({
        axis: () => 'x',
        // Do not capture pointers for toast swipe gestures; capture can steal
        // close-button clicks when the gesture does not move.
        captureTarget: () => null,
        disabled: () => !(getEntry(id)?.dismissible ?? true),
        onCancel: ({ event }) => {
          const inner = getInner(event);

          if (!inner) return;

          inner.style.transition = '';
          inner.style.transform = '';
          inner.style.opacity = '';
        },
        onCommit: ({ distance, event }) => {
          const inner = getInner(event);

          if (!inner) return;

          const dir = distance >= 0 ? 1 : -1;
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const finish = () => finalizeRemoval(id);

          if (reducedMotion) {
            inner.style.opacity = '0';
            finish();

            return;
          }

          inner.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
          void inner.offsetWidth;
          inner.style.transform = `translateX(${dir * 120}%)`;
          inner.style.opacity = '0';

          const onTransitionEnd = (e: TransitionEvent) => {
            if (e.target !== inner || e.propertyName !== 'transform') return;

            inner.removeEventListener('transitionend', onTransitionEnd);
            clearTimeout(fallback);
            finish();
          };

          const fallback = setTimeout(() => {
            inner.removeEventListener('transitionend', onTransitionEnd);
            finish();
          }, 300);

          inner.addEventListener('transitionend', onTransitionEnd);
        },
        onMove: ({ distance, event }) => {
          const inner = getInner(event);

          if (!inner) return;

          inner.style.transition = 'none';
          inner.style.transform = `translateX(${distance}px)`;
          inner.style.opacity = String(Math.max(0, 1 - Math.abs(distance) / 200));
        },
      });

    // ── Toast lifecycle ────────────────────────────────────────────────────

    /** Remove all per-entry resources and fire callbacks. Does not animate. */
    const finalizeRemoval = (id: string) => {
      const entry = getEntry(id);

      // Clean up timer and swipe control before removing from signal.
      if (entry?.timer) clearTimeout(entry.timer.timeoutId);

      swipeControls.delete(id);
      entries.value = entries.value.filter((e) => e.id !== id);
      entry?.onDismiss?.();
      emit('dismiss', { id });
    };

    const addToast = (item: ToastItem): string => {
      const id = item.id || uuid();
      const maxToasts = props.max?.value ?? 5;

      // Evict oldest non-exiting toasts to stay within max — animated, with callbacks.
      const active = entries.value.filter((e) => e.phase !== 'exiting');
      const overflow = active.length - (maxToasts - 1);

      if (overflow > 0) {
        for (const evicted of active.slice(0, overflow)) removeToast(evicted.id);
      }

      const entry: ToastEntry = {
        dismissible: true,
        duration: 5000,
        ...item,
        id,
        phase: 'entering',
        timer: null,
      };

      swipeControls.set(id, createToastSwipe(id));
      entries.value = [...entries.value, entry];
      emit('add', { id });

      requestAnimationFrame(() => {
        // Guard: if the toast was dismissed before this rAF fired (e.g. evicted
        // by max), do not overwrite its exiting phase back to active.
        if (getEntry(id)?.phase === 'entering') updateEntry(id, { phase: 'active' });
      });

      if (entry.duration > 0) scheduleTimer(id, entry.duration);

      return id;
    };

    const removeToast = (id: string) => {
      const entry = getEntry(id);

      // Already animating out or not found — ignore.
      if (!entry || entry.phase === 'exiting') return;

      // Clear the auto-dismiss timer: the user (or max-eviction) is dismissing now.
      updateEntry(id, { ...clearEntryTimer(entry), phase: 'exiting' });

      // Force a layout flush on the current inner element (if in DOM now) so the
      // browser snapshots the current opacity as the animation start value.
      const innerEl = containerRef.value?.querySelector<HTMLElement>(`[data-toast-id="${id}"] .toast-inner`);

      void innerEl?.offsetHeight;

      let done = false;
      const onDone = () => {
        if (done) return;

        done = true;
        finalizeRemoval(id);
      };

      // TOAST_EXIT_MS matches the CSS opacity transition duration.
      // Fallback fires if transitionend never arrives (jsdom, reduced-motion, etc.).
      const fallback = setTimeout(onDone, TOAST_EXIT_MS + 50);

      // Listen on the container with event delegation so we are immune to
      // ore re-rendering the entries list (e.g. rAF phase transitions that
      // rebuild DOM after our listener would have been set up).
      // transitionend bubbles, so it reaches the container regardless of which
      // generation of .toast-inner element fires it.
      const onTransitionEnd = (e: TransitionEvent) => {
        const wrapper = (e.target as HTMLElement | null)?.closest?.(`[data-toast-id="${id}"]`);

        if (!wrapper) return;

        containerRef.value?.removeEventListener('transitionend', onTransitionEnd);
        clearTimeout(fallback);
        onDone();
      };

      containerRef.value?.addEventListener('transitionend', onTransitionEnd);
    };

    const updateToast = (id: string, updates: Partial<ToastItem>) => {
      const entry = getEntry(id);

      if (!entry) return;

      const cleared = updates.duration !== undefined ? clearEntryTimer(entry) : entry;

      updateEntry(id, { ...cleared, ...updates, id });

      if (updates.duration !== undefined && updates.duration > 0) scheduleTimer(id, updates.duration);
    };

    const clearAll = () => {
      // Fire all removals concurrently — parallel fades are visually correct.
      for (const e of entries.value) {
        if (e.phase !== 'exiting') removeToast(e.id);
      }
    };

    // ── Derived lists for live regions ─────────────────────────────────────

    const urgencyOf = (e: ToastEntry) => e.urgency ?? (e.color === 'error' ? 'assertive' : 'polite');
    const politeEntries = computed(() => entries.value.filter((e) => urgencyOf(e) === 'polite'));
    const assertiveEntries = computed(() => entries.value.filter((e) => urgencyOf(e) === 'assertive'));

    // ── Cleanup on disconnect ──────────────────────────────────────────────

    onCleanup(() => {
      for (const e of entries.value) {
        if (e.timer) clearTimeout(e.timer.timeoutId);
      }

      swipeControls.clear();
    });

    // ── Template ───────────────────────────────────────────────────────────

    const renderEntry = (entry: ToastEntry) => {
      const dismiss = () => removeToast(entry.id);

      return html`
        <div
          class="toast-wrapper"
          data-toast-id=${entry.id}
          part="toast-wrapper"
          @pointerdown=${(e: PointerEvent) => swipeControls.get(entry.id)?.handlePointerDown(e)}
          @pointermove=${(e: PointerEvent) => swipeControls.get(entry.id)?.handlePointerMove(e)}
          @pointerup=${(e: PointerEvent) => swipeControls.get(entry.id)?.handlePointerUp(e)}
          @pointercancel=${(e: PointerEvent) => swipeControls.get(entry.id)?.handlePointerCancel(e)}>
          <div class="${() => `toast-inner${entry.phase !== 'active' ? ` ${entry.phase}` : ''}`}" part="toast-inner">
            <ore-alert
              color=${entry.color || (entry.urgency === 'assertive' ? 'error' : 'primary')}
              variant=${entry.variant || 'solid'}
              size=${entry.size || 'md'}
              rounded=${entry.rounded || 'md'}
              ?horizontal=${entry.horizontal}
              heading=${entry.heading || ''}
              ?dismissible=${entry.dismissible !== false}
              @dismiss=${dismiss}>
              ${entry.meta ? html`<span slot="meta">${entry.meta}</span>` : ''} ${entry.message}
              ${renderToastActions(entry, dismiss)}
            </ore-alert>
          </div>
        </div>
      `;
    };

    // Expose imperative API directly on mount — calls made before mount are
    // safe because ore mounts synchronously on connectedCallback.
    onMounted(() => {
      const toastEl = el as ToastElement;

      toastEl.add = addToast;
      toastEl.clear = clearAll;
      toastEl.dismiss = removeToast;
      toastEl.update = updateToast;
    });

    return html`
      <div
        class="toast-container"
        ref=${containerRef}
        @pointerenter=${() => {
          hoverPaused.value = true;
          el.classList.add('hovered');
        }}
        @pointerleave=${() => {
          hoverPaused.value = false;
          el.classList.remove('hovered');
        }}
        @focusin=${() => {
          focusPaused.value = true;
        }}
        @focusout=${() => {
          focusPaused.value = false;
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
          ${() => politeEntries.value.map(renderEntry)}
        </div>
        <!-- Assertive live region: critical errors that interrupt immediately -->
        <div
          role="region"
          aria-live="assertive"
          aria-relevant="additions removals"
          aria-atomic="false"
          aria-label="Critical notifications"
          class="toast-live-region">
          ${() => assertiveEntries.value.map(renderEntry)}
        </div>
        <slot></slot>
      </div>
    `;
  },
  styles: [reducedMotionMixin, componentStyles],
});

// ─── Toast service ────────────────────────────────────────────────────────────

export type ToastServiceConfig = OreToastProps;

export interface ToastService {
  /** Add a toast and return its id */
  add(item: ToastItem): string;
  /** Dismiss all toasts (animated, in parallel) */
  clear(): void;
  /**
   * Configure the auto-created container.
   * Has no effect if called after the first `add()` — logs a dev warning in that case.
   */
  configure(config: ToastServiceConfig): void;
  /** Dismiss a toast by id (animated) */
  dismiss(id: string): void;
  /** Shortcut: error toast with red color (assertive live region) */
  error(message: string, opts?: Partial<ToastItem>): string;
  /** Shortcut: info toast */
  info(message: string, opts?: Partial<ToastItem>): string;
  /**
   * Shows a loading toast tied to a promise.
   * Updates to success/error when the promise settles.
   */
  promise<T>(
    promise: Promise<T>,
    messages: {
      error: string | ((err: unknown) => string);
      loading: string;
      success: string | ((data: T) => string);
    },
  ): Promise<T>;
  /** Shortcut: success toast with green color */
  success(message: string, opts?: Partial<ToastItem>): string;
  /** Update an existing toast in-place */
  update(id: string, updates: Partial<ToastItem>): void;
  /** Shortcut: warning toast */
  warning(message: string, opts?: Partial<ToastItem>): string;
}

/**
 * Creates a scoped toast service backed by an `ore-toast` element.
 *
 * The service lazily creates an `<ore-toast>` element inside `root` on first
 * use. Pass a custom root to scope notifications to a sub-tree (e.g. a drawer),
 * or use the pre-built `toast` singleton which targets `document.body`.
 *
 * @example
 * ```ts
 * // Scoped instance
 * const drawerToast = createToastService(drawerEl);
 * drawerToast.success('Saved inside drawer');
 *
 * // The default singleton
 * import { toast } from '@vielzeug/refine';
 * toast.success('Saved!');
 * ```
 */
export function createToastService(root: ParentNode = document.body): ToastService {
  let host: ToastElement | null = null;
  let configured = false;
  let pendingConfig: ToastServiceConfig | null = null;

  const getHost = (): ToastElement => {
    if (host?.isConnected) return host;

    // Re-use an existing element in the root (supports declarative placement).
    host = (root instanceof Element ? root : (root as Document | ShadowRoot)).querySelector<ToastElement>('ore-toast');

    if (!host) {
      host = document.createElement('ore-toast') as ToastElement;

      if (pendingConfig) {
        if (pendingConfig.position) host.setAttribute('position', pendingConfig.position);

        if (pendingConfig.max != null) host.setAttribute('max', String(pendingConfig.max));

        pendingConfig = null;
      }

      (root as Element | Document).appendChild(host);
    }

    configured = true;

    return host;
  };

  const service: ToastService = {
    add(item) {
      return getHost().add(item);
    },

    clear() {
      getHost().clear();
    },

    configure(config) {
      if (configured) {
        warn('toast.configure() called after the container was already created; options ignored.');

        return;
      }

      pendingConfig = { ...pendingConfig, ...config };
    },

    dismiss(id) {
      getHost().dismiss(id);
    },

    error(message, opts) {
      return service.add({ color: 'error', ...opts, message });
    },

    info(message, opts) {
      return service.add({ color: 'info', ...opts, message });
    },

    async promise(promise, messages) {
      const id = service.add({ color: 'primary', dismissible: false, duration: 0, message: messages.loading });

      try {
        const data = await promise;

        service.update(id, {
          color: 'success',
          dismissible: true,
          duration: 5000,
          message: typeof messages.success === 'function' ? messages.success(data) : messages.success,
        });

        return data;
      } catch (err) {
        service.update(id, {
          color: 'error',
          dismissible: true,
          duration: 5000,
          message: typeof messages.error === 'function' ? messages.error(err) : messages.error,
        });
        throw err;
      }
    },

    success(message, opts) {
      return service.add({ color: 'success', ...opts, message });
    },

    update(id, updates) {
      getHost().update(id, updates);
    },

    warning(message, opts) {
      return service.add({ color: 'warning', ...opts, message });
    },
  };

  return service;
}

/**
 * Singleton toast service — finds or creates a single `<ore-toast>` on `document.body`.
 *
 * @example
 * ```ts
 * import { toast } from '@vielzeug/refine';
 *
 * toast.success('Changes saved!');
 * toast.error('Upload failed', { duration: 0 });
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
export const toast: ToastService = createToastService();
