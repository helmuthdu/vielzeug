import type { Shortcut } from './parser';
import type { BindingEntry, BindingValue, Handler, Keymap, KeymapOptions, When } from './types';

import { warn } from './_dev';
import { KeymapError } from './errors';
import { canonicalizeShortcut, detectModKey, matchStep, parseShortcut } from './parser';

type ParsedBinding = {
  handler: Handler;
  shortcut: Shortcut;
  trigger: 'keydown' | 'keyup';
  when?: When;
};

type ChordTracker = ReturnType<typeof createChordTracker>;
type MountedTarget = {
  keydown: ChordTracker;
  keyup: ChordTracker;
  onKeydown: EventListener;
  onKeyup: EventListener;
  refs: number;
};

function resolveBinding(value: BindingValue): Omit<ParsedBinding, 'shortcut'> {
  if (typeof value === 'function') return { handler: value, trigger: 'keydown' };

  return {
    handler: value.handler,
    trigger: value.trigger ?? 'keydown',
    when: value.when,
  };
}

function createChordTracker(getBindings: () => ParsedBinding[], chordTimeout: number) {
  let pendingIndex = 0;
  let candidates: ParsedBinding[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  function reset(): void {
    if (timer !== undefined) clearTimeout(timer);

    timer = undefined;
    pendingIndex = 0;
    candidates = [];
  }

  function advance(event: KeyboardEvent): ParsedBinding | undefined {
    const pool = pendingIndex === 0 ? getBindings() : candidates;
    const matched = pool.filter((binding) => {
      const step = binding.shortcut[pendingIndex];

      return step !== undefined && matchStep(event, step);
    });

    if (matched.length === 0) {
      const retryFromRoot = pendingIndex !== 0;

      reset();

      return retryFromRoot ? advance(event) : undefined;
    }

    if (timer !== undefined) clearTimeout(timer);

    timer = undefined;

    const completed = matched.find((binding) => binding.shortcut.length === pendingIndex + 1);

    if (completed) {
      reset();

      return completed;
    }

    candidates = matched;
    pendingIndex += 1;
    timer = setTimeout(reset, chordTimeout);

    return undefined;
  }

  return { advance, reset };
}

/**
 * Creates a headless keyboard shortcut manager with target-local chord state.
 *
 * Pass a bindings map of shortcut strings to handlers or `BindingOptions`, then call
 * `.mount(target)` to attach to any `EventTarget`. Supports chord sequences
 * (e.g. `"ctrl+k ctrl+s"`), per-binding `when` guards, `trigger` (keydown/keyup),
 * and dynamic `bind`/`unbind`.
 *
 * @example
 * const map = createKeymap({
 *   'mod+k mod+s': () => save(),
 *   'mod+shift+p': () => openPalette(),
 *   'g g': () => goToTop(),
 *   esc: { handler: closePanel, when: (event) => !isEditableTarget(event.target) },
 *   space: { handler: togglePlay, trigger: 'keyup' },
 * }, { modKey: 'ctrl' });
 * const unmount = map.mount(document);
 */
export function createKeymap(initialBindings: Record<string, BindingValue> = {}, options: KeymapOptions = {}): Keymap {
  const {
    chordTimeout: rawChordTimeout = 1000,
    modKey = detectModKey(),
    preventDefault = true,
    stopPropagation = false,
    when: globalWhen,
  } = options;
  const chordTimeout = Number.isFinite(rawChordTimeout) && rawChordTimeout > 0 ? rawChordTimeout : 1000;

  if (chordTimeout !== rawChordTimeout) {
    warn(`chordTimeout must be a positive finite number; received ${rawChordTimeout}. Using default of 1000ms.`);
  }

  const bindings = new Map<string, ParsedBinding>();
  const mounted = new Map<EventTarget, MountedTarget>();
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
  }

  function bindingKey(shortcut: string): string {
    return canonicalizeShortcut(parseShortcut(shortcut, modKey));
  }

  function addBinding(shortcut: string, value: BindingValue): string {
    const parsed = parseShortcut(shortcut, modKey);
    const key = canonicalizeShortcut(parsed);

    bindings.set(key, { shortcut: parsed, ...resolveBinding(value) });
    rebuildTriggerCaches();

    return key;
  }

  function removeByKey(key: string): boolean {
    const existed = bindings.delete(key);

    if (existed) rebuildTriggerCaches();

    return existed;
  }

  function makeHandler(target: EventTarget, chord: ChordTracker): EventListener {
    return (event) => {
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const nearestMountedTarget = path.find((pathTarget) => mounted.has(pathTarget));

      if (nearestMountedTarget && nearestMountedTarget !== target) return;

      const keyboardEvent = event as KeyboardEvent;

      if (disposed || (globalWhen && !globalWhen(keyboardEvent))) return;

      const binding = chord.advance(keyboardEvent);

      if (!binding || (binding.when && !binding.when(keyboardEvent))) return;

      if (preventDefault) keyboardEvent.preventDefault();

      if (stopPropagation) keyboardEvent.stopPropagation();

      binding.handler(keyboardEvent);
    };
  }

  for (const [shortcut, value] of Object.entries(initialBindings)) addBinding(shortcut, value);

  return {
    bind(shortcut: string, value: BindingValue): () => void {
      assertActive();

      const key = addBinding(shortcut, value);

      return () => {
        if (!disposed) removeByKey(key);
      };
    },

    get disposalSignal(): AbortSignal {
      return disposalController.signal;
    },

    dispose(): void {
      if (disposed) return;

      disposed = true;
      disposalController.abort();

      for (const [target, record] of mounted) {
        target.removeEventListener('keydown', record.onKeydown);
        target.removeEventListener('keyup', record.onKeyup);
        record.keydown.reset();
        record.keyup.reset();
      }

      mounted.clear();
      bindings.clear();
      bindingsDown = [];
      bindingsUp = [];
    },

    get disposed(): boolean {
      return disposed;
    },

    listBindings(): readonly BindingEntry[] {
      return [...bindings.values()].map((binding) => ({
        shortcut: binding.shortcut.map((step) => ({ key: step.key, modifiers: new Set(step.modifiers) })),
        trigger: binding.trigger,
      }));
    },

    mount(target: EventTarget): () => void {
      assertActive();

      let record = mounted.get(target);

      if (!record) {
        const keydown = createChordTracker(() => bindingsDown, chordTimeout);
        const keyup = createChordTracker(() => bindingsUp, chordTimeout);
        const onKeydown = makeHandler(target, keydown);
        const onKeyup = makeHandler(target, keyup);

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

        if (record!.refs > 0) return;

        target.removeEventListener('keydown', record!.onKeydown);
        target.removeEventListener('keyup', record!.onKeyup);
        record!.keydown.reset();
        record!.keyup.reset();
        mounted.delete(target);
      };
    },

    [Symbol.dispose](): void {
      this.dispose();
    },

    unbind(shortcut: string): void {
      assertActive();

      if (!removeByKey(bindingKey(shortcut))) {
        warn(`unbind() called for unknown shortcut: "${shortcut}"`);
      }
    },
  };
}
