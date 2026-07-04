import type { Shortcut } from './parser';
import type { BindingEntry, BindingOptions, BindingValue, Handler, Keymap, KeymapOptions } from './types';

import { warn } from './_dev';
import { canonicalizeShortcut, detectModKey, matchStep, parseShortcut } from './parser';

type ParsedBinding = {
  handler: Handler;
  priority: number;
  shortcut: Shortcut;
  trigger: 'keydown' | 'keyup';
  when?: () => boolean;
};

function resolveBinding(value: BindingValue): Omit<ParsedBinding, 'shortcut'> {
  if (typeof value === 'function') {
    return { handler: value, priority: 0, trigger: 'keydown' };
  }

  const priority = value.priority ?? 0;

  if (!Number.isFinite(priority)) {
    warn(`binding priority must be a finite number; received ${priority}. Using 0.`);
  }

  return {
    handler: value.handler,
    priority: Number.isFinite(priority) ? priority : 0,
    trigger: value.trigger ?? 'keydown',
    when: value.when,
  };
}

function createChordTracker(getBindings: () => ParsedBinding[], chordTimeout: number) {
  let pendingIndex = 0;
  let candidates: ParsedBinding[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function reset(): void {
    clearTimer();
    pendingIndex = 0;
    candidates = [];
  }

  function advance(event: KeyboardEvent): ParsedBinding | null {
    // At the root of a chord, re-scan every binding. Mid-chord, narrow only within bindings that
    // already matched every prior step — never re-admit a binding whose earlier step didn't match.
    const pool = pendingIndex === 0 ? getBindings() : candidates;
    const matched: ParsedBinding[] = [];

    for (const binding of pool) {
      const step = binding.shortcut[pendingIndex];

      if (step && matchStep(event, step)) {
        matched.push(binding);
      }
    }

    if (matched.length === 0) {
      const wasPartial = pendingIndex !== 0;

      reset();

      if (wasPartial) {
        return advance(event);
      }

      return null;
    }

    clearTimer();

    // At most one binding can complete here — the bindings map is keyed by canonical shortcut,
    // so two live bindings can never share an identical step sequence. `priority` therefore never
    // has a real tie to resolve; the shortest completing match always fires immediately.
    const completed = matched.find((b) => b.shortcut.length === pendingIndex + 1);

    if (completed) {
      reset();

      return completed;
    }

    candidates = matched;
    pendingIndex++;
    timer = setTimeout(reset, chordTimeout);

    return null;
  }

  return { advance, reset };
}

/**
 * Creates a headless keyboard shortcut manager.
 *
 * Pass a bindings map of shortcut strings to handlers or `BindingOptions`, then call
 * `.mount(target)` to attach to any `EventTarget`. Supports chord sequences
 * (e.g. `"ctrl+k ctrl+s"`), per-binding `when` guards, `trigger` (keydown/keyup),
 * `priority`, and dynamic `bind`/`unbind`.
 *
 * @example
 * const map = createKeymap({
 *   'mod+k mod+s': () => save(),
 *   'mod+shift+p': () => openPalette(),
 *   'g g': () => goToTop(),
 *   esc: { handler: closePanel, when: () => isPanelOpen() },
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
  let bindingsDown: ParsedBinding[] = [];
  let bindingsUp: ParsedBinding[] = [];

  function rebuildTriggerCaches(): void {
    bindingsDown = [];
    bindingsUp = [];

    for (const b of bindings.values()) {
      if (b.trigger === 'keydown') bindingsDown.push(b);
      else bindingsUp.push(b);
    }
  }

  function addBinding(shortcutStr: string, value: BindingValue): string {
    const shortcut = parseShortcut(shortcutStr, modKey);
    const key = canonicalizeShortcut(shortcut);

    bindings.set(key, { shortcut, ...resolveBinding(value) });
    rebuildTriggerCaches();

    return key;
  }

  function removeByKey(key: string): boolean {
    const existed = bindings.delete(key);

    if (existed) rebuildTriggerCaches();

    return existed;
  }

  function removeBinding(shortcutStr: string): boolean {
    const shortcut = parseShortcut(shortcutStr, modKey);
    const key = canonicalizeShortcut(shortcut);

    return removeByKey(key);
  }

  for (const [shortcutStr, value] of Object.entries(initialBindings)) {
    const shortcut = parseShortcut(shortcutStr, modKey);
    const key = canonicalizeShortcut(shortcut);

    bindings.set(key, { shortcut, ...resolveBinding(value) });
  }

  rebuildTriggerCaches();

  const chordDown = createChordTracker(() => bindingsDown, chordTimeout);
  const chordUp = createChordTracker(() => bindingsUp, chordTimeout);
  const unmounts = new Set<() => void>();
  const mountCounts = new Map<EventTarget, number>();

  function makeHandler(chord: ReturnType<typeof createChordTracker>) {
    return function handleEvent(event: KeyboardEvent): void {
      if (globalWhen && !globalWhen()) return;

      const binding = chord.advance(event);

      if (!binding) return;

      if (binding.when && !binding.when()) return;

      if (preventDefault) event.preventDefault();

      if (stopPropagation) event.stopPropagation();

      binding.handler(event);
    };
  }

  const handleKeydown = makeHandler(chordDown);
  const handleKeyup = makeHandler(chordUp);
  const ac = new AbortController();
  let isDisposed = false;

  return {
    bind(shortcutStr: string, value: BindingValue): () => void {
      const key = addBinding(shortcutStr, value);

      return () => {
        removeByKey(key);
      };
    },

    get disposalSignal(): AbortSignal {
      return ac.signal;
    },

    dispose(): void {
      if (isDisposed) return;

      isDisposed = true;
      ac.abort();
      for (const unmount of unmounts) unmount();
      unmounts.clear();
      chordDown.reset();
      chordUp.reset();
    },

    get disposed(): boolean {
      return isDisposed;
    },

    listBindings(): readonly BindingEntry[] {
      return [...bindings.values()].map((b) => ({
        priority: b.priority,
        shortcut: b.shortcut.map((s) => ({ key: s.key, modifiers: new Set(s.modifiers) })),
        trigger: b.trigger,
      }));
    },

    mount(target: EventTarget): () => void {
      const priorCount = mountCounts.get(target) ?? 0;

      if (priorCount > 0) {
        warn('mount() called for a target that is already mounted — this registers a duplicate listener');
      }

      mountCounts.set(target, priorCount + 1);

      target.addEventListener('keydown', handleKeydown as EventListener);
      target.addEventListener('keyup', handleKeyup as EventListener);

      const unmount = (): void => {
        target.removeEventListener('keydown', handleKeydown as EventListener);
        target.removeEventListener('keyup', handleKeyup as EventListener);
        unmounts.delete(unmount);

        const remaining = (mountCounts.get(target) ?? 1) - 1;

        if (remaining <= 0) mountCounts.delete(target);
        else mountCounts.set(target, remaining);
      };

      unmounts.add(unmount);

      return unmount;
    },

    [Symbol.dispose](): void {
      this.dispose();
    },

    unbind(shortcutStr: string): void {
      const existed = removeBinding(shortcutStr);

      if (!existed) {
        warn(`unbind() called for unknown shortcut: "${shortcutStr}"`);
      }
    },
  };
}

export type { BindingOptions };
