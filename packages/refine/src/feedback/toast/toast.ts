import '../alert/alert';
import { uuid } from '@vielzeug/arsenal';
import { define, getHost, html, onCleanup, onMounted, prop, ref, useEmit } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { watch } from '@vielzeug/ripple/watch';

import type { SwipeControl } from '../../core';
import type { ComponentSize, RoundedSize, ThemeColor } from '../../types';

import { warn } from '../../_dev';
import { createSwipeControl } from '../../core';
import { reducedMotionMixin } from '../../styles';
import componentStyles from './toast.css?inline';

/** Must match toast.css's default opacity transition duration. */
const TOAST_EXIT_MS = 300;

export type OreToastEvents = {
  add: { id: string };
  dismiss: { id: string };
};

export type OreToastProps = {
  max?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
};

/** Individual toast notification. */
export type ToastItem = {
  actions?: Array<{
    color?: ThemeColor;
    label: string;
    onClick?: () => void;
    variant?: 'solid' | 'flat' | 'bordered';
  }>;
  color?: ThemeColor;
  dismissible?: boolean;
  /** Auto-dismiss delay in ms. Set to 0 for persistent toasts (default: 5000). */
  duration?: number;
  heading?: string;
  /** Show message and actions side-by-side (horizontal layout). */
  horizontal?: boolean;
  /** Auto-generated when omitted. */
  id?: string;
  message: string;
  /** Metadata text (for example, a timestamp) shown in the alert meta slot. */
  meta?: string;
  /** Called after the toast is fully dismissed and removed. */
  onDismiss?: () => void;
  rounded?: RoundedSize | '';
  size?: ComponentSize;
  /**
   * Screen-reader announcement urgency. Error-coloured toasts are assertive by
   * default; all other toasts are polite.
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

type ToastEntry = Required<Pick<ToastItem, 'dismissible' | 'duration' | 'id'>> &
  Omit<ToastItem, 'dismissible' | 'duration' | 'id'> & {
    exitTimeoutId: ReturnType<typeof setTimeout> | null;
    id: string;
    phase: ToastPhase;
    timer: ToastTimer | null;
  };

type ToastStoreEvent = {
  id: string;
  type: 'add' | 'dismiss';
};

/**
 * Owns notification data and every timer. Renderers only subscribe to this
 * store; they never expose imperative mutation methods themselves.
 */
class ToastStore {
  readonly #entries = signal<ToastEntry[]>([]);
  readonly #listeners = new Set<(entries: ToastEntry[]) => void>();
  readonly #eventListeners = new Set<(event: ToastStoreEvent) => void>();
  #disposed = false;
  #max = 5;

  add(item: ToastItem): string {
    if (this.#disposed) return item.id ?? uuid();

    const id = item.id ?? uuid();
    const active = this.#entries.value.filter((entry) => entry.phase !== 'exiting');
    const overflow = active.length - (this.#max - 1);

    if (overflow > 0) {
      for (const entry of active.slice(0, overflow)) this.dismiss(entry.id);
    }

    const entry: ToastEntry = {
      dismissible: true,
      duration: 5000,
      ...item,
      exitTimeoutId: null,
      id,
      phase: 'entering',
      timer: null,
    };

    this.#setEntries([...this.#entries.value, entry]);
    this.#emit({ id, type: 'add' });

    requestAnimationFrame(() => {
      if (this.#entry(id)?.phase === 'entering') this.#update(id, { phase: 'active' });
    });

    if (entry.duration > 0) this.#scheduleTimer(id, entry.duration);

    return id;
  }

  clear(): void {
    for (const entry of this.#entries.value) {
      if (entry.phase !== 'exiting') this.dismiss(entry.id);
    }
  }

  dispose(): void {
    if (this.#disposed) return;

    this.#disposed = true;

    for (const entry of this.#entries.value) {
      if (entry.timer) clearTimeout(entry.timer.timeoutId);

      if (entry.exitTimeoutId) clearTimeout(entry.exitTimeoutId);
    }

    this.#setEntries([]);
    this.#listeners.clear();
    this.#eventListeners.clear();
  }

  dismiss(id: string): void {
    const entry = this.#entry(id);

    if (!entry || entry.phase === 'exiting' || this.#disposed) return;

    this.#update(id, { ...this.#clearTimer(entry), phase: 'exiting' });
    this.scheduleFinalization(id, TOAST_EXIT_MS + 50);
  }

  finalize(id: string): void {
    const entry = this.#entry(id);

    if (!entry || this.#disposed) return;

    if (entry.timer) clearTimeout(entry.timer.timeoutId);

    if (entry.exitTimeoutId) clearTimeout(entry.exitTimeoutId);

    this.#setEntries(this.#entries.value.filter((candidate) => candidate.id !== id));
    entry.onDismiss?.();
    this.#emit({ id, type: 'dismiss' });
  }

  pauseTimers(): void {
    if (this.#disposed) return;

    this.#setEntries(
      this.#entries.value.map((entry) => {
        if (!entry.timer) return entry;

        clearTimeout(entry.timer.timeoutId);

        return {
          ...entry,
          timer: {
            ...entry.timer,
            remaining: Math.max(0, entry.timer.remaining - (Date.now() - entry.timer.startedAt)),
          },
        };
      }),
    );
  }

  resumeTimers(): void {
    if (this.#disposed) return;

    for (const entry of this.#entries.value) {
      if (entry.phase === 'active' && entry.timer && entry.timer.remaining > 0) {
        this.#scheduleTimer(entry.id, entry.timer.remaining);
      }
    }
  }

  scheduleFinalization(id: string, delay: number): void {
    const entry = this.#entry(id);

    if (!entry || entry.phase !== 'exiting' || this.#disposed) return;

    if (entry.exitTimeoutId) clearTimeout(entry.exitTimeoutId);

    const exitTimeoutId = setTimeout(() => this.finalize(id), delay);

    this.#update(id, { exitTimeoutId });
  }

  setMax(max: number | undefined): void {
    if (max != null) this.#max = Math.max(1, max);
  }

  subscribe(listener: (entries: ToastEntry[]) => void): () => void {
    listener(this.#entries.value);
    this.#listeners.add(listener);

    return () => this.#listeners.delete(listener);
  }

  subscribeEvents(listener: (event: ToastStoreEvent) => void): () => void {
    this.#eventListeners.add(listener);

    return () => this.#eventListeners.delete(listener);
  }

  update(id: string, updates: Partial<ToastItem>): void {
    const entry = this.#entry(id);

    if (!entry || this.#disposed) return;

    const cleared = updates.duration !== undefined ? this.#clearTimer(entry) : entry;

    this.#update(id, { ...cleared, ...updates, id });

    if (updates.duration !== undefined && updates.duration > 0) this.#scheduleTimer(id, updates.duration);
  }

  #clearTimer(entry: ToastEntry): ToastEntry {
    if (entry.timer) clearTimeout(entry.timer.timeoutId);

    return { ...entry, timer: null };
  }

  #emit(event: ToastStoreEvent): void {
    for (const listener of this.#eventListeners) listener(event);
  }

  #entry(id: string): ToastEntry | undefined {
    return this.#entries.value.find((entry) => entry.id === id);
  }

  #scheduleTimer(id: string, remaining: number): void {
    if (remaining <= 0 || this.#disposed) return;

    const timeoutId = setTimeout(() => this.dismiss(id), remaining);

    this.#update(id, { timer: { remaining, startedAt: Date.now(), timeoutId } });
  }

  #setEntries(entries: ToastEntry[]): void {
    this.#entries.value = entries;
    for (const listener of this.#listeners) listener(entries);
  }

  #update(id: string, patch: Partial<ToastEntry>): void {
    this.#setEntries(this.#entries.value.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }
}

type ToastHostBinding = {
  bind: (store: ToastStore) => void;
  unbind: () => void;
};

const hostBindings = new WeakMap<HTMLElement, ToastHostBinding>();
const hostStores = new WeakMap<HTMLElement, ToastStore>();

const bindToastHost = (host: HTMLElement, store: ToastStore): void => {
  hostStores.set(host, store);
  hostBindings.get(host)?.bind(store);
};

/** Renders the action buttons for a toast entry. */
function renderToastActions(entry: ToastEntry, dismiss: () => void) {
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
              dismiss();
            }}>
            ${action.label}
          </ore-button>
        `,
      )}
    </div>
  `;
}

export const TOAST_TAG = 'ore-toast' as const;

/**
 * Declarative toast host. It subscribes to the service for its scope and
 * renders notifications, but has no imperative mutation API of its own.
 *
 * @element ore-toast
 *
 * @attr {string} position - Stack placement.
 * @attr {number} max - Maximum live notifications for the scoped service.
 */
define<OreToastProps>(TOAST_TAG, {
  props: {
    max: prop.number(5),
    position: prop.oneOf(
      ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const,
      'bottom-right',
    ),
  },
  setup() {
    const el = getHost() as HTMLElement;
    const emit = useEmit<OreToastEvents>();
    const containerRef = ref<HTMLDivElement>();
    const entries = signal<ToastEntry[]>([]);
    const hoverPaused = signal(false);
    const focusPaused = signal(false);
    const paused = computed(() => hoverPaused.value || focusPaused.value);
    const swipeControls = new Map<string, SwipeControl>();
    const exiting = new Map<string, () => void>();
    const swiping = new Set<string>();
    let store: ToastStore | null = null;
    let unsubscribeEntries = () => {};
    let unsubscribeEvents = () => {};

    const getInner = (wrapperOrEvent: HTMLElement | Event): HTMLElement | null => {
      const wrapper = wrapperOrEvent instanceof Event ? (wrapperOrEvent.currentTarget as HTMLElement) : wrapperOrEvent;

      return wrapper.querySelector<HTMLElement>('.toast-inner');
    };

    const clearExitListener = (id: string): void => {
      exiting.get(id)?.();
      exiting.delete(id);
    };

    const finalizeSwipe = (id: string): void => {
      swiping.delete(id);
      store?.finalize(id);
    };

    const createToastSwipe = (id: string): SwipeControl => {
      const isDismissible = (): boolean => entries.value.find((entry) => entry.id === id)?.dismissible ?? true;

      return createSwipeControl({
        axis: () => 'x',
        captureTarget: () => null,
        disabled: {
          peek: () => !isDismissible(),
          subscribe: (listener) => entries.subscribe(listener),
          get value() {
            return !isDismissible();
          },
        },
        onCancel: ({ event }) => {
          const inner = getInner(event);

          if (!inner) return;

          inner.style.transition = '';
          inner.style.transform = '';
          inner.style.opacity = '';
        },
        onCommit: ({ distance, event }) => {
          const inner = getInner(event);

          if (!inner || !store) return;

          swiping.add(id);

          store.dismiss(id);

          const finish = () => finalizeSwipe(id);

          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            inner.style.opacity = '0';
            finish();

            return;
          }

          const direction = distance >= 0 ? 1 : -1;

          inner.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
          void inner.offsetWidth;
          inner.style.transform = `translateX(${direction * 120}%)`;
          inner.style.opacity = '0';

          const onTransitionEnd = (transition: TransitionEvent) => {
            if (transition.target !== inner || transition.propertyName !== 'transform') return;

            inner.removeEventListener('transitionend', onTransitionEnd);
            finish();
          };

          inner.addEventListener('transitionend', onTransitionEnd);
          store.scheduleFinalization(id, 300);
        },
        onMove: ({ distance, event }) => {
          const inner = getInner(event);

          if (!inner) return;

          inner.style.transition = 'none';
          inner.style.transform = `translateX(${distance}px)`;
          inner.style.opacity = String(Math.max(0, 1 - Math.abs(distance) / 200));
        },
        onRelease: ({ event }) => {
          const inner = getInner(event);

          if (!inner) return;

          inner.style.transition = '';
          inner.style.transform = '';
          inner.style.opacity = '';
        },
      });
    };

    const beginExit = (id: string): void => {
      if (!store || exiting.has(id) || swiping.has(id)) return;

      requestAnimationFrame(() => {
        if (!store || exiting.has(id) || swiping.has(id)) return;

        const inner = containerRef.value?.querySelector<HTMLElement>(`[data-toast-id="${id}"] .toast-inner`);

        if (!inner) {
          store.scheduleFinalization(id, TOAST_EXIT_MS);

          return;
        }

        void inner.offsetHeight;

        const duration = parseFloat(getComputedStyle(inner).transitionDuration) * 1000;
        const exitMs = Number.isFinite(duration) && duration > 0 ? duration : TOAST_EXIT_MS;
        const onTransitionEnd = (event: TransitionEvent) => {
          const wrapper = (event.target as HTMLElement | null)?.closest?.(`[data-toast-id="${id}"]`);

          if (!wrapper) return;

          clearExitListener(id);
          store?.finalize(id);
        };
        const remove = () => containerRef.value?.removeEventListener('transitionend', onTransitionEnd);

        exiting.set(id, remove);
        containerRef.value?.addEventListener('transitionend', onTransitionEnd);
        store.scheduleFinalization(id, exitMs + 50);
      });
    };

    const syncControls = (): void => {
      const currentIds = new Set(entries.value.map((entry) => entry.id));

      for (const [id, control] of swipeControls) {
        if (!currentIds.has(id)) {
          control.dispose();

          swipeControls.delete(id);
          clearExitListener(id);
          swiping.delete(id);
        }
      }

      for (const entry of entries.value) {
        if (!swipeControls.has(entry.id)) swipeControls.set(entry.id, createToastSwipe(entry.id));

        if (entry.phase === 'exiting') beginExit(entry.id);
      }
    };

    watch(entries, syncControls);
    watch(paused, (isPaused) => {
      if (isPaused) store?.pauseTimers();
      else store?.resumeTimers();
    });

    const bind = (nextStore: ToastStore): void => {
      if (store === nextStore) return;

      unsubscribeEntries();

      unsubscribeEvents();
      store = nextStore;
      unsubscribeEntries = store.subscribe((nextEntries) => {
        entries.value = nextEntries;
      });
      unsubscribeEvents = store.subscribeEvents((event) => emit(event.type, { id: event.id }));

      if (paused.value) store.pauseTimers();
    };

    const renderEntry = (entry: ToastEntry) => {
      const dismiss = () => store?.dismiss(entry.id);

      return html`
        <div
          class="toast-wrapper"
          data-toast-id=${entry.id}
          part="toast-wrapper"
          @pointerdown=${(event: PointerEvent) => swipeControls.get(entry.id)?.handlePointerDown(event)}
          @pointermove=${(event: PointerEvent) => swipeControls.get(entry.id)?.handlePointerMove(event)}
          @pointerup=${(event: PointerEvent) => swipeControls.get(entry.id)?.handlePointerUp(event)}
          @pointercancel=${(event: PointerEvent) => swipeControls.get(entry.id)?.handlePointerCancel(event)}>
          <div class="${() => `toast-inner${entry.phase !== 'active' ? ` ${entry.phase}` : ''}`}" part="toast-inner">
            <ore-alert
              color=${entry.color || (entry.urgency === 'assertive' ? 'error' : 'primary')}
              variant=${entry.variant || 'solid'}
              size=${entry.size || 'md'}
              rounded=${entry.rounded || 'md'}
              ?horizontal=${entry.horizontal}
              heading=${entry.heading || ''}
              ?dismissible=${entry.dismissible}
              @dismiss=${dismiss}>
              ${
                entry.meta
                  ? html`
                      <span slot="meta">${entry.meta}</span>
                    `
                  : ''
              }
              ${entry.message} ${renderToastActions(entry, dismiss)}
            </ore-alert>
          </div>
        </div>
      `;
    };

    onMounted(() => {
      hostBindings.set(el, {
        bind,
        unbind() {
          unsubscribeEntries();
          unsubscribeEvents();
          store = null;
          entries.value = [];
        },
      });

      const boundStore = hostStores.get(el);

      if (boundStore) bind(boundStore);
    });

    onCleanup(() => {
      hostBindings.get(el)?.unbind();

      hostBindings.delete(el);

      for (const control of swipeControls.values()) control.dispose();
      for (const id of exiting.keys()) clearExitListener(id);
    });

    const urgencyOf = (entry: ToastEntry) => entry.urgency ?? (entry.color === 'error' ? 'assertive' : 'polite');
    const politeEntries = computed(() => entries.value.filter((entry) => urgencyOf(entry) === 'polite'));
    const assertiveEntries = computed(() => entries.value.filter((entry) => urgencyOf(entry) === 'assertive'));

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
        <div
          role="region"
          aria-live="polite"
          aria-relevant="additions removals"
          aria-atomic="false"
          aria-label="Notifications"
          class="toast-live-region">
          ${() => politeEntries.value.map(renderEntry)}
        </div>
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

export type ToastServiceConfig = OreToastProps;

export interface ToastService {
  add(item: ToastItem): string;
  clear(): void;
  configure(config: ToastServiceConfig): void;
  readonly disposed: boolean;
  dismiss(id: string): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  error(message: string, opts?: Partial<ToastItem>): string;
  info(message: string, opts?: Partial<ToastItem>): string;
  promise<T>(
    promise: Promise<T>,
    messages: {
      error: string | ((err: unknown) => string);
      loading: string;
      success: string | ((data: T) => string);
    },
  ): Promise<T>;
  success(message: string, opts?: Partial<ToastItem>): string;
  update(id: string, updates: Partial<ToastItem>): void;
  warning(message: string, opts?: Partial<ToastItem>): string;
  [Symbol.dispose](): void;
}

const services = new WeakMap<ParentNode, ToastService>();

/**
 * Creates a scoped toast service. The service owns its notification store and
 * binds it to the declarative `<ore-toast>` host inside `root`, creating that
 * host lazily when notifications are first requested.
 */
export function createToastService(root: ParentNode = document.body): ToastService {
  const existing = services.get(root);

  if (existing) return existing;

  const store = new ToastStore();
  const disposalController = new AbortController();
  let disposed = false;
  let configured = false;
  let pendingConfig: ToastServiceConfig | null = null;
  let host: HTMLElement | null = null;

  const assertActive = (): boolean => !disposed;
  const rootNode = root as Element | Document | ShadowRoot;
  const getHost = (): HTMLElement | null => {
    if (!assertActive()) return null;

    if (host?.isConnected) return host;

    host = rootNode.querySelector<HTMLElement>(TOAST_TAG);

    if (!host) {
      host = document.createElement(TOAST_TAG);

      if (pendingConfig?.position) host.setAttribute('position', pendingConfig.position);

      if (pendingConfig?.max != null) host.setAttribute('max', String(pendingConfig.max));

      rootNode.appendChild(host);
    }

    if (pendingConfig?.max != null) store.setMax(pendingConfig.max);
    else {
      const max = Number(host.getAttribute('max'));

      if (Number.isFinite(max) && max > 0) store.setMax(max);
    }

    pendingConfig = null;
    configured = true;
    bindToastHost(host, store);

    return host;
  };
  const ensureHost = (): boolean => Boolean(getHost());

  const service: ToastService = {
    add(item) {
      if (!ensureHost()) return item.id ?? uuid();

      return store.add(item);
    },

    clear() {
      if (ensureHost()) store.clear();
    },

    configure(config) {
      if (configured) {
        warn('toast.configure() called after the container was already created; options ignored.');

        return;
      }

      pendingConfig = { ...pendingConfig, ...config };
    },

    dismiss(id) {
      if (ensureHost()) store.dismiss(id);
    },

    get disposalSignal() {
      return disposalController.signal;
    },

    dispose() {
      if (disposed) return;

      disposed = true;

      disposalController.abort();

      store.dispose();

      if (services.get(root) === service) services.delete(root);
    },

    get disposed() {
      return disposed;
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

    [Symbol.dispose]() {
      service.dispose();
    },

    update(id, updates) {
      if (ensureHost()) store.update(id, updates);
    },

    warning(message, opts) {
      return service.add({ color: 'warning', ...opts, message });
    },
  };

  services.set(root, service);

  return service;
}

/** Singleton service backed by a lazily created host in `document.body`. */
export const toast: ToastService = createToastService();
