import { onCleanup as _onCleanup, scope as _scope, type Scope, untrack } from '@vielzeug/ripple';

import type { ComponentDefinition, SetupContextBag } from './component-types';

import { CraftitError, reportRuntimeError } from './errors';
import { createBind } from './host-bind';
import { createProps, type InferPropsSignals, propRegistry, type PropsDef } from './props';
import { type OnMountedCallback, type RuntimeContext, withRuntimeContext } from './runtime';
import { type ComponentSlots, createSlots } from './slots';
import { ComponentPhase, LIFECYCLE_EVENTS } from './types';
import { type HTMLResult } from './types/bindings';
import { loadStylesheet } from './utils/css';
import { createEmitFn } from './utils/emit';

// ─── Internal component state ─────────────────────────────────────────────────

type ComponentState = {
  mountCallbacks: OnMountedCallback[];
  mountToken: number;
  phase: ComponentPhase;
  scope: Scope;
  templateResult: HTMLResult | null;
};

const createComponentState = (): ComponentState => ({
  mountCallbacks: [],
  mountToken: 0,
  phase: ComponentPhase.UNINITIALIZED,
  scope: _scope(),
  templateResult: null,
});

// ─── BaseElement ──────────────────────────────────────────────────────────────

export class BaseElement extends HTMLElement {
  static _definition: ComponentDefinition<any, any, any>;
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

    const propMeta = propRegistry.get(this)?.get(name);

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
    this._component.mountToken++;
    this._component.phase = ComponentPhase.UNMOUNTED;
    this._component.scope.dispose();
    this.dispatchEvent(new CustomEvent(LIFECYCLE_EVENTS.DISCONNECT, { bubbles: false, composed: false }));
    // Reset state (scope, callbacks, template) for next connect
    this._component = createComponentState();
  }

  private _handleSetupError(error: unknown, operation = 'connectedCallback'): HTMLResult | void {
    const err = error instanceof Error ? error : new Error(String(error));
    const craftError = new CraftitError(
      `[craft] <${this.localName}> failed during ${this._component.phase} (${operation})`,
      { cause: err, component: this.localName, phase: this._component.phase },
    );
    const def = (this.constructor as typeof BaseElement)._definition;

    if (def?.onError) {
      try {
        return def.onError(craftError, this);
      } catch {
        /* fall through */
      }
    }

    reportRuntimeError(craftError, this);
  }

  private _runSetup(): void {
    this._component.phase = ComponentPhase.SETUP_RUNNING;

    const def = (this.constructor as typeof BaseElement)._definition;
    const normalizedPropDefs = (this.constructor as typeof BaseElement)._normalizedPropDefs;
    const ctx: RuntimeContext = { element: this, mountCallbacks: [] };

    try {
      let setupResult: HTMLResult | Promise<HTMLResult> | undefined;

      this._component.scope.run(() => {
        setupResult = withRuntimeContext(ctx, () => {
          // createProps must run inside withRuntimeContext since registerProp calls getCurrentElement()
          const setupProps = normalizedPropDefs
            ? createProps(normalizedPropDefs)
            : ({} as InferPropsSignals<Record<never, never>>);
          const bind = createBind(this);
          const emit = createEmitFn(this);
          const slots = createSlots() as ComponentSlots<string>;

          const contextBag: SetupContextBag<Record<string, never>, string> = {
            bind,
            el: this,
            emit,
            slots,
          };

          return def.setup(setupProps as InferPropsSignals<Record<never, never>>, contextBag);
        });
      });
      this._component.mountCallbacks.push(...ctx.mountCallbacks);

      if (setupResult instanceof Promise) {
        // Async setup: show loading template immediately, swap when resolved.
        // Store captured mount callbacks; they will be scheduled after the real template mounts.
        const pendingCallbacks = this._component.mountCallbacks.splice(0);

        this._component.phase = ComponentPhase.LOADING;

        if (def.loading) {
          this._component.templateResult = def.loading();
        }

        // Capture the current component state so the async handler can detect staleness:
        // if the element disconnects+reconnects before the promise resolves, _component is
        // replaced with a fresh state and the old promise result must be discarded.
        void this._runSetupAsync(setupResult, pendingCallbacks, this._component);
      } else {
        this._component.templateResult = setupResult as HTMLResult;
        this._component.phase = ComponentPhase.SETUP_DONE;
      }
    } catch (error) {
      const recoveryTemplate = this._handleSetupError(error);

      if (recoveryTemplate) {
        this._component.templateResult = recoveryTemplate;
        this._component.phase = ComponentPhase.SETUP_DONE;
      } else {
        this._component.phase = ComponentPhase.UNINITIALIZED;
        throw error;
      }
    }
  }

  private async _runSetupAsync(
    promise: Promise<HTMLResult>,
    pendingCallbacks: OnMountedCallback[],
    capturedState: ComponentState,
  ): Promise<void> {
    try {
      const result = await promise;

      // Discard stale results: element disconnected+reconnected since this setup started.
      if (this._component !== capturedState || !this.isConnected) return;

      this._component.templateResult = result;
      this._component.phase = ComponentPhase.SETUP_DONE;
      this._component.mountCallbacks.push(...pendingCallbacks);
      this._applyResult(result);
      this._scheduleMountCallbacks();
    } catch (error) {
      if (this._component !== capturedState || !this.isConnected) return;

      const recovery = this._handleSetupError(error, 'asyncSetup');

      if (recovery) {
        this._component.templateResult = recovery;
        this._component.phase = ComponentPhase.SETUP_DONE;
        this._applyResult(recovery);
      }
    }
  }

  private _applyResult(result: HTMLResult): void {
    const host: Element | ShadowRoot = this.shadowRoot ?? this;

    host.replaceChildren(result.fragment);
    this._component.scope.run(() => {
      result.apply(_onCleanup);
    });
  }

  private _init(): void {
    this._applyStyles();
    this._mountTemplate();

    // Only schedule mount callbacks once setup is fully complete (not in LOADING state)
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

    const token = ++this._component.mountToken;

    queueMicrotask(() => {
      if (!this.isConnected || token !== this._component.mountToken) return;

      // Snapshot callbacks so in-loop registrations don't extend this iteration.
      const batch = this._component.mountCallbacks.splice(0);

      for (const callback of batch) {
        try {
          const nestedCtx = { element: this, mountCallbacks: [] as typeof this._component.mountCallbacks };

          this._component.scope.run(() => {
            withRuntimeContext(nestedCtx, () => {
              const cleanup = callback();

              if (typeof cleanup === 'function') _onCleanup(cleanup);
            });
          });

          if (nestedCtx.mountCallbacks.length > 0) {
            this._component.mountCallbacks.push(...nestedCtx.mountCallbacks);
          }
        } catch (error) {
          this._handleSetupError(error, 'mountedCallback');
        }
      }

      // If nested onMounted calls registered new callbacks, schedule them with
      // a fresh token check in the next microtask.
      if (this._component.mountCallbacks.length > 0) {
        this._scheduleMountCallbacks();
      }
    });
  }
}
