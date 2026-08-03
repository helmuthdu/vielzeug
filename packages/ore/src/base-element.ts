import { createScope, type Scope, untrack } from '@vielzeug/ripple';

import type { ComponentDefinition } from './component-types';

import { OreApiError, type OreErrorPhase, OreLifecycleError, ORE_ERRORS, reportRuntimeError } from './errors';
import { createProps, getPropMeta, type InferProps, type PropInputDefs, type PropsDef } from './props';
import {
  beginPendingWork,
  createRuntimeContext,
  type OnFormResetCallback,
  type OnMountedCallback,
  onCleanup,
  runWithContext,
} from './runtime';
import { type HTMLResult } from './template/result';
import { loadStylesheet } from './utils/css';

// ─── Component phases & lifecycle events ──────────────────────────────────────
// Internal to BaseElement — the only state machine and event dispatcher in the package.

const ComponentPhase = {
  SETUP_DONE: 'setup_done',
  SETUP_RUNNING: 'setup_running',
  UNINITIALIZED: 'uninitialized',
  UNMOUNTED: 'unmounted',
} as const;

type ComponentPhase = (typeof ComponentPhase)[keyof typeof ComponentPhase];

const LIFECYCLE_EVENTS = {
  CONNECT: 'ore:connect',
  DISCONNECT: 'ore:disconnect',
} as const;

// ─── Internal component state ─────────────────────────────────────────────────

type ComponentState = {
  /** Registered via `onFormReset()` — persists across mount callbacks, unlike `mountCallbacks`. */
  formResetCallbacks: OnFormResetCallback[];
  /** Incremented on every disconnect — invalidates queued mount callbacks. */
  generation: number;
  mountCallbacks: OnMountedCallback[];
  phase: ComponentPhase;
  scope: Scope;
  templateResult: HTMLResult | null;
};

const createComponentState = (): ComponentState => ({
  formResetCallbacks: [],
  generation: 0,
  mountCallbacks: [],
  phase: ComponentPhase.UNINITIALIZED,
  scope: createScope(),
  templateResult: null,
});

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  (typeof value === 'object' || typeof value === 'function') &&
  value !== null &&
  'then' in value &&
  typeof value.then === 'function';

// ─── BaseElement ──────────────────────────────────────────────────────────────

/**
 * Phase transitions:
 *
 * ```
 * UNINITIALIZED ──_runSetup()──► SETUP_DONE
 * SETUP_DONE ──disconnectedCallback()──► UNMOUNTED ──(reset)──► UNINITIALIZED
 * ```
 *
 * `generation` increments on every disconnect. Scheduled mount callbacks capture
 * it so callbacks belonging to a disconnected instance cannot run after a
 * reconnect (see `_isStale`).
 *
 * Why this lives on the class instead of a standalone pure reducer: every
 * transition here is triggered by running actual user code (`def.setup()`,
 * `onMounted` callbacks) inside a reactive `scope.run()` + `runWithContext()`
 * — there is no meaningful "decide the next phase" step that can be separated
 * from "run the side-effecting thing that produces the phase change" without
 * introducing a data-only effect-description layer that this package has no
 * other use for. That's why the methods below stay as direct, readable
 * procedural steps instead of a reducer + effect interpreter.
 */
export class BaseElement extends HTMLElement {
  static _definition: ComponentDefinition;
  static _normalizedPropDefs: PropsDef<Record<never, never>> | undefined;
  static formAssociated = false;
  static observedAttributes: string[] = [];

  private _component: ComponentState;

  constructor() {
    super();

    const def = (this.constructor as typeof BaseElement)._definition;

    if (def?.shadow !== false) {
      this.attachShadow({ mode: 'open', ...(def?.shadow as Partial<ShadowRootInit> | undefined) });
    }

    this._component = createComponentState();
  }

  connectedCallback(): void {
    untrack(() => {
      if (this._component.phase === ComponentPhase.UNINITIALIZED) this._runSetup();

      this._init();
    });
    this.dispatchEvent(new CustomEvent(LIFECYCLE_EVENTS.CONNECT, { bubbles: false, composed: false }));
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
    this._component.generation++;
    this._component.phase = ComponentPhase.UNMOUNTED;
    this.dispatchEvent(new CustomEvent(LIFECYCLE_EVENTS.DISCONNECT, { bubbles: false, composed: false }));
    this._resetSetupState();
  }

  /** Dispose one connection's resources before its state can be rebuilt. */
  private _resetSetupState(): void {
    this._component.scope.dispose();
    // Reset mutable fields for next connection, keeping the same object for stable references.
    this._component.formResetCallbacks = [];
    this._component.mountCallbacks = [];
    this._component.phase = ComponentPhase.UNINITIALIZED;
    this._component.scope = createScope();
    this._component.templateResult = null;
  }

  /**
   * Native form-association lifecycle callback — the browser calls this on every
   * `formAssociated: true` element inside a `<form>` when that form is reset.
   * Runs every `onFormReset()` callback registered during `setup()`.
   */
  formResetCallback(): void {
    for (const callback of this._component.formResetCallbacks) {
      try {
        callback();
      } catch (error) {
        this._reportLifecycleError(error, 'form-reset');
      }
    }
  }

  private _reportLifecycleError(error: unknown, phase: OreErrorPhase): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const oreError = new OreLifecycleError(`<${this.localName}> failed during ${this._component.phase} (${phase})`, {
      cause: err,
      component: this.localName,
      phase,
    });

    reportRuntimeError(oreError, this);
  }

  private _runSetup(): void {
    this._component.phase = ComponentPhase.SETUP_RUNNING;

    const def = (this.constructor as typeof BaseElement)._definition;
    const normalizedPropDefs = (this.constructor as typeof BaseElement)._normalizedPropDefs;
    const ctx = createRuntimeContext(this);

    try {
      let setupResult: HTMLResult | null | undefined;

      this._component.scope.run(() => {
        setupResult = runWithContext(ctx, () => {
          const setupProps = normalizedPropDefs
            ? createProps(this, normalizedPropDefs)
            : ({} as InferProps<PropInputDefs>);

          return def.setup(setupProps as InferProps<PropInputDefs>);
        });
      });
      this._component.mountCallbacks.push(...ctx.mountCallbacks);
      this._component.formResetCallbacks.push(...ctx.formResetCallbacks);

      if (isPromiseLike(setupResult)) throw new OreApiError(ORE_ERRORS.asyncSetupUnsupported);

      this._component.templateResult = setupResult ?? null;
      this._component.phase = ComponentPhase.SETUP_DONE;
    } catch (error) {
      this._reportLifecycleError(error, 'setup');
      // Setup is atomic: a failed run must not leave partial effects or cleanups
      // live until a later disconnect.
      this._resetSetupState();
      throw error;
    }
  }

  private _isStale(capturedGeneration: number): boolean {
    return this._component.generation !== capturedGeneration || !this.isConnected;
  }

  private _applyResult(result: HTMLResult | null): void {
    if (!result) return;

    const host: Element | ShadowRoot = this.shadowRoot ?? this;

    // Mounting can register component cleanup, so preserve a runtime context here too.
    const context = createRuntimeContext(this);

    host.replaceChildren();
    this._component.scope.run(() => {
      runWithContext(context, () => {
        result.mount(host, null, onCleanup);
      });
    });
  }

  private _init(): void {
    this._applyStyles();
    this._mountTemplate();

    // Setup completes before the template mounts, so callbacks always observe live DOM.
    if (this._component.phase === ComponentPhase.SETUP_DONE) this._scheduleMountCallbacks();
  }

  private _applyStyles(): void {
    const def = (this.constructor as typeof BaseElement)._definition;

    if (this.shadowRoot && def?.styles?.length) {
      this.shadowRoot.adoptedStyleSheets = def.styles.map(loadStylesheet);
    }
  }

  private _mountTemplate(): void {
    const result = this._component.templateResult;

    if (!result) return;

    this._applyResult(result);
  }

  private _scheduleMountCallbacks(): void {
    if (this._component.mountCallbacks.length === 0) return;

    const capturedGeneration = this._component.generation;
    // Tracked as pending work for the duration of this microtask — ended in a `finally`
    // so a thrown callback (already caught per-callback below, but defensive here too)
    // never leaves the counter stuck above zero. See runtime.ts's beginPendingWork().
    const endWork = beginPendingWork();

    queueMicrotask(() => {
      try {
        if (this._isStale(capturedGeneration)) return;

        // Snapshot callbacks so in-loop registrations don't extend this iteration.
        const batch = this._component.mountCallbacks.splice(0);

        for (const callback of batch) {
          try {
            const nestedCtx = createRuntimeContext(this);

            this._component.scope.run(() => {
              runWithContext(nestedCtx, () => {
                const cleanup = callback();

                if (typeof cleanup === 'function') onCleanup(cleanup);
              });
            });

            if (nestedCtx.mountCallbacks.length > 0) {
              this._component.mountCallbacks.push(...nestedCtx.mountCallbacks);
            }

            if (nestedCtx.formResetCallbacks.length > 0) {
              this._component.formResetCallbacks.push(...nestedCtx.formResetCallbacks);
            }
          } catch (error) {
            this._reportLifecycleError(error, 'mounted');
          }
        }

        // If nested onMounted calls registered new callbacks, schedule them with
        // a fresh token check in the next microtask. This happens *before* endWork()
        // below runs so the counter never dips to zero between the two schedules.
        if (this._component.mountCallbacks.length > 0) {
          this._scheduleMountCallbacks();
        }
      } finally {
        endWork();
      }
    });
  }
}
