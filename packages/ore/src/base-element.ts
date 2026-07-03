import { scope as _scope, type Scope, untrack } from '@vielzeug/ripple';

import type { ComponentDefinition } from './component-types';

import { warn } from './_dev';
import { createContextBag } from './context-bag';
import { type OreErrorPhase, OreLifecycleError, reportRuntimeError } from './errors';
import { createProps, getPropMeta, type InferProps, type PropInputDefs, type PropsDef } from './props';
import { type OnMountedCallback, onCleanup, type RuntimeContext, runWithContext } from './runtime';
import { ComponentPhase, LIFECYCLE_EVENTS } from './types';
import { type HTMLResult } from './types/bindings';
import { loadStylesheet } from './utils/css';

// ─── Internal component state ─────────────────────────────────────────────────

type ComponentState = {
  /** Incremented on every disconnect — guards both mount callbacks and async setup results. */
  generation: number;
  mountCallbacks: OnMountedCallback[];
  phase: ComponentPhase;
  scope: Scope;
  templateResult: HTMLResult | null;
};

const createComponentState = (): ComponentState => ({
  generation: 0,
  mountCallbacks: [],
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
    this._component.scope.dispose();
    // Reset mutable fields for next connect, keeping the same object for stable references
    this._component.mountCallbacks = [];
    this._component.phase = ComponentPhase.UNINITIALIZED;
    this._component.scope = _scope();
    this._component.templateResult = null;
  }

  private _handleSetupError(error: unknown, phase: OreErrorPhase = 'setup'): HTMLResult | void {
    const err = error instanceof Error ? error : new Error(String(error));
    const oreError = new OreLifecycleError(`<${this.localName}> failed during ${this._component.phase} (${phase})`, {
      cause: err,
      component: this.localName,
      phase,
    });
    const def = (this.constructor as typeof BaseElement)._definition;

    if (def?.onError) {
      try {
        return def.onError(oreError, this);
      } catch {
        /* fall through */
      }
    }

    reportRuntimeError(oreError, this);
  }

  private _runSetup(): void {
    this._component.phase = ComponentPhase.SETUP_RUNNING;

    const def = (this.constructor as typeof BaseElement)._definition;
    const normalizedPropDefs = (this.constructor as typeof BaseElement)._normalizedPropDefs;
    const ctx: RuntimeContext = { element: this, mountCallbacks: [] };

    try {
      let setupResult: HTMLResult | null | Promise<HTMLResult | null> | undefined;

      this._component.scope.run(() => {
        setupResult = runWithContext(ctx, () => {
          const setupProps = normalizedPropDefs
            ? createProps(this, normalizedPropDefs)
            : ({} as InferProps<PropInputDefs>);
          const contextBag = createContextBag(this);

          return def.setup(setupProps as InferProps<PropInputDefs>, contextBag);
        });
      });
      this._component.mountCallbacks.push(...ctx.mountCallbacks);

      if (setupResult != null && typeof (setupResult as Promise<HTMLResult | null>).then === 'function') {
        // Async setup: show loading template immediately, swap when resolved.
        // Store captured mount callbacks; they will be scheduled after the real template mounts.
        const pendingCallbacks = this._component.mountCallbacks.splice(0);

        this._component.phase = ComponentPhase.LOADING;

        if (def.loading) {
          this._component.templateResult = def.loading();
        }

        // Capture the current generation so the async handler can detect staleness:
        // if the element disconnects+reconnects before the promise resolves, generation is
        // incremented and the old promise result must be discarded.
        void this._runSetupAsync(
          setupResult as Promise<HTMLResult | null>,
          pendingCallbacks,
          this._component.generation,
        );
      } else {
        this._component.templateResult = (setupResult as HTMLResult | null) ?? null;
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
    promise: Promise<HTMLResult | null>,
    pendingCallbacks: OnMountedCallback[],
    capturedGeneration: number,
  ): Promise<void> {
    try {
      const result = await promise;

      // Discard stale results: element disconnected+reconnected since this setup started.
      if (this._component.generation !== capturedGeneration || !this.isConnected) {
        warn(`<${this.localName}> async setup result discarded — element disconnected before setup resolved.`);

        return;
      }

      this._component.templateResult = result ?? null;
      this._component.phase = ComponentPhase.SETUP_DONE;
      this._component.mountCallbacks.push(...pendingCallbacks);

      if (result) this._applyResult(result);

      this._scheduleMountCallbacks();
    } catch (error) {
      if (this._component.generation !== capturedGeneration || !this.isConnected) {
        warn(`<${this.localName}> async setup error discarded — element disconnected before setup resolved.`);

        return;
      }

      const recovery = this._handleSetupError(error, 'async-setup');

      if (recovery) {
        this._component.templateResult = recovery;
        this._component.phase = ComponentPhase.SETUP_DONE;
        this._applyResult(recovery);
      } else {
        this._component.phase = ComponentPhase.UNINITIALIZED;
      }
    }
  }

  private _applyResult(result: HTMLResult | null): void {
    if (!result) return;

    const host: Element | ShadowRoot = this.shadowRoot ?? this;

    host.replaceChildren(result.fragment);
    this._component.scope.run(() => {
      result.apply(onCleanup);
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

    const capturedGeneration = this._component.generation;

    queueMicrotask(() => {
      if (!this.isConnected || capturedGeneration !== this._component.generation) return;

      // Snapshot callbacks so in-loop registrations don't extend this iteration.
      const batch = this._component.mountCallbacks.splice(0);

      for (const callback of batch) {
        try {
          const nestedCtx = { element: this, mountCallbacks: [] as typeof this._component.mountCallbacks };

          this._component.scope.run(() => {
            runWithContext(nestedCtx, () => {
              const cleanup = callback();

              if (typeof cleanup === 'function') onCleanup(cleanup);
            });
          });

          if (nestedCtx.mountCallbacks.length > 0) {
            this._component.mountCallbacks.push(...nestedCtx.mountCallbacks);
          }
        } catch (error) {
          this._handleSetupError(error, 'mounted');
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
