import { warn } from './_dev';
import { KeymapError } from './errors';
import type { Shortcut } from './parser';
import { detectModKey, matchStep, parseShortcut } from './parser';
import type { Binding, BindingEntry, Handler, Keymap, KeymapEvent, KeymapOptions, When } from './types';

type ParsedBinding = {
  id: string;
  handler: Handler;
  shortcut: Shortcut;
  trigger: 'keydown' | 'keyup';
  when?: When;
  preventDefault: boolean;
  stopPropagation: boolean;
};

type ChordAdvanceResult =
  | { type: 'none' }
  | { bindings: ParsedBinding[]; type: 'pending' }
  | { binding: ParsedBinding; type: 'match' };
type ChordTrackerCallbacks = {
  onCancel: () => void;
  onProgress: (steps: Shortcut, started: boolean) => void;
  onTimeout: () => void;
};
type ChordTracker = ReturnType<typeof createChordTracker>;
type MountedTarget = {
  keydown: ChordTracker;
  keyup: ChordTracker;
  onKeydown: EventListener;
  onKeyup: EventListener;
  refs: number;
};

const noop = () => {};

function createChordTracker(
  getBindings: () => ParsedBinding[],
  chordTimeout: number,
  callbacks: ChordTrackerCallbacks,
) {
  let pendingIndex = 0;
  let candidates: ParsedBinding[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  function reset(notify = true): void {
    if (timer !== undefined) clearTimeout(timer);

    const hadPending = pendingIndex > 0;

    timer = undefined;
    pendingIndex = 0;
    candidates = [];

    if (notify && hadPending) callbacks.onCancel();
  }

  function advance(event: KeyboardEvent): ChordAdvanceResult {
    const pool = pendingIndex === 0 ? getBindings() : candidates;
    const matched = pool.filter((binding) => {
      const step = binding.shortcut[pendingIndex];

      return step !== undefined && matchStep(event, step) && (!binding.when || binding.when(event));
    });

    if (matched.length === 0) {
      const retryFromRoot = pendingIndex !== 0;

      reset();

      return retryFromRoot ? advance(event) : { type: 'none' };
    }

    if (timer !== undefined) clearTimeout(timer);

    timer = undefined;

    const completed = matched.find((binding) => binding.shortcut.length === pendingIndex + 1);

    if (completed) {
      reset(false);

      return { binding: completed, type: 'match' };
    }

    const started = pendingIndex === 0;

    candidates = matched;
    pendingIndex += 1;
    callbacks.onProgress(matched[0]!.shortcut.slice(0, pendingIndex), started);
    timer = setTimeout(() => {
      callbacks.onTimeout();
      reset(false);
    }, chordTimeout);

    return { bindings: matched, type: 'pending' };
  }

  return { advance, reset };
}

/**
 * Creates a headless keyboard shortcut manager with target-local chord state.
 *
 * Pass an ordered array of `Binding` objects (each with an explicit `id`,
 * `shortcut`, and `handler`), then call `.mount(target)` to attach to any
 * `EventTarget`. Supports chord sequences (e.g. `"ctrl+k ctrl+s"`), per-binding
 * `when` guards, `trigger` (keydown/keyup), and per-binding
 * `preventDefault`/`stopPropagation`. Dynamic `bind`/`unbind` use the binding
 * `id`, so duplicate shortcuts can coexist with different ids.
 *
 * @example
 * const map = createKeymap([
 *   { id: 'save', shortcut: 'mod+k mod+s', handler: save },
 *   { id: 'palette', shortcut: 'mod+shift+p', handler: openPalette },
 *   { id: 'top', shortcut: 'g g', handler: goToTop },
 *   { id: 'close', shortcut: 'escape', handler: closePanel, when: (event) => !isEditableTarget(event.target) },
 *   { id: 'play', shortcut: 'space', handler: togglePlay, trigger: 'keyup' },
 * ], { modKey: 'ctrl' });
 * const unmount = map.mount(document);
 */
export function createKeymap(initialBindings: readonly Binding[] = [], options: KeymapOptions = {}): Keymap {
  const { chordTimeout: rawChordTimeout = 1000, modKey = detectModKey(), when: globalWhen } = options;
  const chordTimeout = Number.isFinite(rawChordTimeout) && rawChordTimeout > 0 ? rawChordTimeout : 1000;

  if (chordTimeout !== rawChordTimeout) {
    warn(`chordTimeout must be a positive finite number; received ${rawChordTimeout}. Using default of 1000ms.`);
  }

  // Ordered map keyed by binding id — preserves insertion order and supports
  // duplicate shortcuts with different ids.
  const bindings = new Map<string, ParsedBinding>();
  const mounted = new Map<EventTarget, MountedTarget>();
  const tappers = new Set<(event: KeymapEvent) => void>();
  const disposalController = new AbortController();
  let bindingsDown: ParsedBinding[] = [];
  let bindingsUp: ParsedBinding[] = [];
  let disposed = false;

  function assertActive(): void {
    if (disposed) throw new KeymapError('Keymap is disposed');
  }

  function rebuildTriggerCaches(): void {
    bindingsDown = [];
    bindingsUp = [];

    for (const binding of bindings.values()) {
      if (binding.trigger === 'keydown') bindingsDown.push(binding);
      else bindingsUp.push(binding);
    }

    for (const record of mounted.values()) {
      record.keydown.reset();
      record.keyup.reset();
    }
  }

  function addBinding(binding: Binding): ParsedBinding {
    const parsedBinding: ParsedBinding = {
      handler: binding.handler,
      id: binding.id,
      preventDefault: binding.preventDefault ?? true,
      shortcut: parseShortcut(binding.shortcut, modKey),
      stopPropagation: binding.stopPropagation ?? false,
      trigger: binding.trigger ?? 'keydown',
      when: binding.when,
    };

    bindings.set(parsedBinding.id, parsedBinding);
    rebuildTriggerCaches();

    return parsedBinding;
  }

  function removeById(id: string): boolean {
    const existed = bindings.delete(id);

    if (existed) rebuildTriggerCaches();

    return existed;
  }

  function toBindingEntry(binding: ParsedBinding): BindingEntry {
    return {
      id: binding.id,
      preventDefault: binding.preventDefault,
      shortcut: binding.shortcut.map((step) => ({ key: step.key, modifiers: new Set(step.modifiers) })),
      stopPropagation: binding.stopPropagation,
      trigger: binding.trigger,
    };
  }

  function emitTap(event: KeymapEvent): void {
    if (tappers.size === 0) return;

    for (const tapper of tappers) {
      try {
        tapper(event);
      } catch {}
    }
  }

  function makeHandler(target: EventTarget, trigger: 'keydown' | 'keyup', chord: ChordTracker): EventListener {
    return (event) => {
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const nearestMountedTarget = path.find((pathTarget) => mounted.has(pathTarget));

      if (nearestMountedTarget && nearestMountedTarget !== target) return;

      const keyboardEvent = event as KeyboardEvent;

      if (disposed) return;

      if (globalWhen && !globalWhen(keyboardEvent)) {
        chord.reset();

        return;
      }

      const result = chord.advance(keyboardEvent);

      if (result.type === 'none') return;

      const matchedBindings = result.type === 'pending' ? result.bindings : [result.binding];

      if (matchedBindings.some((binding) => binding.preventDefault)) keyboardEvent.preventDefault();
      if (matchedBindings.some((binding) => binding.stopPropagation)) keyboardEvent.stopPropagation();

      if (result.type === 'pending') return;

      if (tappers.size > 0) {
        emitTap({ binding: toBindingEntry(result.binding), target, trigger, type: 'match' });
      }

      result.binding.handler(keyboardEvent);
    };
  }

  for (const binding of initialBindings) addBinding(binding);

  return {
    bind(binding: Binding): () => void {
      assertActive();

      const parsedBinding = addBinding(binding);

      return () => {
        if (!disposed && bindings.get(parsedBinding.id) === parsedBinding) removeById(parsedBinding.id);
      };
    },

    get disposalSignal(): AbortSignal {
      return disposalController.signal;
    },

    dispose(): void {
      if (disposed) return;

      disposed = true;

      for (const [target, record] of mounted) {
        target.removeEventListener('keydown', record.onKeydown);
        target.removeEventListener('keyup', record.onKeyup);
        record.keydown.reset();
        record.keyup.reset();
      }

      emitTap({ type: 'dispose' });
      disposalController.abort();
      mounted.clear();
      bindings.clear();
      bindingsDown = [];
      bindingsUp = [];
      tappers.clear();
    },

    get disposed(): boolean {
      return disposed;
    },

    listBindings(): readonly BindingEntry[] {
      return [...bindings.values()].map(toBindingEntry);
    },

    mount(target: EventTarget): () => void {
      assertActive();

      let record = mounted.get(target);

      if (!record) {
        const createCallbacks = (trigger: 'keydown' | 'keyup'): ChordTrackerCallbacks => ({
          onCancel: () => {
            if (tappers.size > 0) emitTap({ target, trigger, type: 'chord-cancel' });
          },
          onProgress: (steps, started) => {
            if (tappers.size === 0) return;

            const snapshot = steps.map((step) => ({ key: step.key, modifiers: new Set(step.modifiers) }));

            if (started) emitTap({ step: snapshot[0]!, target, trigger, type: 'chord-start' });
            else emitTap({ steps: snapshot, target, trigger, type: 'chord-progress' });
          },
          onTimeout: () => {
            if (tappers.size > 0) emitTap({ target, trigger, type: 'chord-timeout' });
          },
        });
        const keydown = createChordTracker(() => bindingsDown, chordTimeout, createCallbacks('keydown'));
        const keyup = createChordTracker(() => bindingsUp, chordTimeout, createCallbacks('keyup'));
        const onKeydown = makeHandler(target, 'keydown', keydown);
        const onKeyup = makeHandler(target, 'keyup', keyup);

        record = { keydown, keyup, onKeydown, onKeyup, refs: 0 };
        mounted.set(target, record);
        target.addEventListener('keydown', onKeydown);
        target.addEventListener('keyup', onKeyup);
      }

      record.refs += 1;

      let unmounted = false;

      return () => {
        if (unmounted) return;

        unmounted = true;
        record!.refs -= 1;

        if (record?.refs > 0) return;

        target.removeEventListener('keydown', record?.onKeydown);
        target.removeEventListener('keyup', record?.onKeyup);
        record?.keydown.reset();
        record?.keyup.reset();
        mounted.delete(target);
      };
    },

    [Symbol.dispose](): void {
      this.dispose();
    },

    tap(handler: (event: KeymapEvent) => void, options?: { signal?: AbortSignal }): () => void {
      const signal = options?.signal
        ? AbortSignal.any([disposalController.signal, options.signal])
        : disposalController.signal;

      if (signal.aborted) return noop;

      tappers.add(handler);

      const onAbort = () => tappers.delete(handler);

      signal.addEventListener('abort', onAbort, { once: true });

      return () => {
        tappers.delete(handler);
        signal.removeEventListener('abort', onAbort);
      };
    },

    unbind(id: string): void {
      assertActive();

      if (!removeById(id)) {
        warn(`unbind() called for unknown id: "${id}"`);
      }
    },
  };
}
