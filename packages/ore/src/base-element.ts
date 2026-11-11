import { untrack } from '@vielzeug/ripple';

import type { ComponentDefinition } from './component-types';

import { ORE_ERRORS, OreApiError, type OreErrorPhase, OreLifecycleError, reportRuntimeError } from './errors';
import { createProps, getPropMeta, type InferProps, type PropInputDefs, type PropsDef } from './props';
import { beginPendingWork, createRuntimeContext, onCleanup, type RuntimeContext, runWithContext } from './runtime';
import { asCompiled } from './template/result';
import { loadStylesheet } from './utils/css';

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  (typeof value === 'object' || typeof value === 'function') &&
  value !== null &&
  'then' in value &&
  typeof value.then === 'function';

/**
 * Lifecycle: a connection (`_connection`) exists from a successful `setup()` until
 * its teardown. Teardown is deferred one microtask after disconnect so a same-turn
 * node move (reparent, `insertBefore` reordering) reconnects to the same connection:
 * same scope, state, and mounted DOM, no re-setup. A reconnect after the teardown
 * ran is a full remount.
 *
 * ```
 * none ──connect──► connected ──disconnect──► pending teardown ──microtask──► none
 *                       ▲                            │
 *                       └──────── reconnect ─────────┘ (same-turn move)
 * ```
 */
export class BaseElement extends HTMLElement {
  static _definition: ComponentDefinition;
  static _normalizedPropDefs: PropsDef<Record<never, never>> | undefined;
  static formAssociated = false;
  static observedAttributes: string[] = [];

  private _connection: RuntimeContext | null = null;
  private _teardownPending = false;

  constructor() {
    super();

    const def = (this.constructor as typeof BaseElement)._definition;

    if (def?.shadow === false) return;

    // `adoptedStyleSheets` lives on the shadow root, which outlives every connection.
    const shadow = this.attachShadow({ mode: 'open', ...(def?.shadow as Partial<ShadowRootInit> | undefined) });

    if (def?.styles?.length) shadow.adoptedStyleSheets = def.styles.map(loadStylesheet);
  }

  connectedCallback(): void {
    untrack(() => {
      if (this._teardownPending) {
        // Second half of a same-turn move: keep the connection. Mount callbacks that
        // were skipped while detached (the microtask checks `isConnected`) run now.
        this._teardownPending = false;
        this._scheduleMountCallbacks();

        return;
      }

      this._connect();
    });
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    const propMeta = getPropMeta(this, name);

    if (!propMeta) return;

    const parsed = propMeta.parse(newValue);

    if (
      !Object.is(
        untrack(() => propMeta.signal.value),
        parsed,
      )
    )
      propMeta.signal.value = parsed as never;
  }

  disconnectedCallback(): void {
    this._teardownPending = true;

    queueMicrotask(() => {
      if (!this._teardownPending) return;

      this._teardownPending = false;
      this._connection?.scope.dispose();
      this._connection = null;
    });
  }

  /**
   * Native form-association lifecycle callback: the browser calls this on every
   * `formAssociated: true` element inside a `<form>` when that form is reset.
   */
  formResetCallback(): void {
    for (const callback of this._connection?.formResetCallbacks ?? []) {
      try {
        callback();
      } catch (error) {
        this._reportLifecycleError(error, 'form-reset');
      }
    }
  }

  private _reportLifecycleError(error: unknown, phase: OreErrorPhase): void {
    const cause = error instanceof Error ? error : new Error(String(error));

    reportRuntimeError(
      new OreLifecycleError(`<${this.localName}> failed during ${phase}`, { cause, component: this.localName, phase }),
      this,
    );
  }

  /** Run setup and mount its template atomically: a failure leaves no live effects behind. */
  private _connect(): void {
    const ctor = this.constructor as typeof BaseElement;
    const ctx = createRuntimeContext(this);

    try {
      runWithContext(ctx, () => {
        const props = ctor._normalizedPropDefs ? createProps(this, ctor._normalizedPropDefs) : {};
        const result = ctor._definition.setup(props as InferProps<PropInputDefs>);

        if (isPromiseLike(result)) throw new OreApiError(ORE_ERRORS.asyncSetupUnsupported);
        if (result == null) return;

        const host: Element | ShadowRoot = this.shadowRoot ?? this;

        host.replaceChildren();
        asCompiled(result).mount(host, null);
      });
    } catch (error) {
      ctx.scope.dispose();
      this._reportLifecycleError(error, 'setup');
      throw error;
    }

    this._connection = ctx;
    this._scheduleMountCallbacks();
  }

  private _scheduleMountCallbacks(): void {
    const ctx = this._connection;

    if (!ctx || ctx.mountCallbacks.length === 0) return;

    // Tracked so `testing/flush()` can wait for it; see runtime.ts's beginPendingWork().
    const endWork = beginPendingWork();

    queueMicrotask(() => {
      try {
        if (this._connection !== ctx || !this.isConnected) return;

        // Nested `onMounted` registrations append to the queue and run in this same pass.
        let callback = ctx.mountCallbacks.shift();

        while (callback) {
          const current = callback;

          try {
            runWithContext(ctx, () => {
              const cleanup = current();

              if (typeof cleanup === 'function') onCleanup(cleanup);
            });
          } catch (error) {
            this._reportLifecycleError(error, 'mounted');
          }

          callback = ctx.mountCallbacks.shift();
        }
      } finally {
        endWork();
      }
    });
  }
}
