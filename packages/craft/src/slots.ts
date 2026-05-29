/**
 * Slot observation and reactive slot signals.
 *
 * `slots.has(name?)`: Signal<boolean> — whether a named slot has assigned elements.
 * `slots.elements(name?)`: Signal<Element[]> — assigned elements for a slot (flattened).
 */

import { type ReadonlySignal, signal, type Signal } from '@vielzeug/ripple';

import { getCurrentElement, onCleanup, onMounted } from './runtime';

export type ComponentSlots<SlotNames extends string = string> = {
  elements: (name?: SlotNames) => ReadonlySignal<Element[]>;
  has: (name?: SlotNames) => ReadonlySignal<boolean>;
};

const SLOT_DEFAULT = 'default';
const normalizeSlotName = (slotName: string | null | undefined): string => slotName || SLOT_DEFAULT;

export const createSlots = (): ComponentSlots<string> => {
  const host = getCurrentElement();

  type SlotEntry = {
    elements: Signal<Element[]>;
    presence: Signal<boolean>;
  };

  const slotSignals = new Map<string, SlotEntry>();
  const slotNodesByName = new Map<string, Set<HTMLSlotElement>>();
  const slotCleanupMap = new Map<HTMLSlotElement, () => void>();

  const ensureSlotEntry = (normalizedName: string): SlotEntry => {
    let entry = slotSignals.get(normalizedName);

    if (!entry) {
      entry = {
        elements: signal<Element[]>([]),
        presence: signal(false),
      };
      slotSignals.set(normalizedName, entry);
    }

    return entry;
  };

  const areElementsEqual = (prev: Element[], next: Element[]): boolean => {
    if (prev.length !== next.length) return false;

    for (let i = 0; i < prev.length; i++) {
      if (prev[i] !== next[i]) return false;
    }

    return true;
  };

  const recomputeSlot = (name: string): void => {
    const normalized = normalizeSlotName(name);
    const slotsForName = slotNodesByName.get(normalized);
    const assigned: Element[] = [];

    if (slotsForName) {
      for (const slotEl of slotsForName) {
        assigned.push(...slotEl.assignedElements({ flatten: true }));
      }
    }

    const entry = ensureSlotEntry(normalized);

    if (!areElementsEqual(entry.elements.value, assigned)) entry.elements.value = assigned;

    const hasElements = assigned.length > 0;

    if (entry.presence.value !== hasElements) entry.presence.value = hasElements;
  };

  const bindSlot = (slotEl: HTMLSlotElement): void => {
    if (slotCleanupMap.has(slotEl)) return;

    const name = normalizeSlotName(slotEl.getAttribute('name'));
    const setForName = slotNodesByName.get(name) ?? new Set<HTMLSlotElement>();

    setForName.add(slotEl);
    slotNodesByName.set(name, setForName);

    const onChange = () => recomputeSlot(name);

    slotEl.addEventListener('slotchange', onChange);

    slotCleanupMap.set(slotEl, () => {
      slotEl.removeEventListener('slotchange', onChange);
    });

    recomputeSlot(name);
  };

  const bindAllSlots = (): void => {
    host.shadowRoot?.querySelectorAll('slot').forEach((slotEl) => bindSlot(slotEl));
  };

  const recomputeAllSlots = (): void => {
    for (const name of slotNodesByName.keys()) {
      recomputeSlot(name);
    }
  };

  // setup() runs before the template is rendered, so bind once now (if any slots
  // already exist) and schedule another pass after first render.
  bindAllSlots();
  onMounted(() => {
    bindAllSlots();
    recomputeAllSlots();
  });

  onCleanup(() => {
    for (const cleanup of slotCleanupMap.values()) cleanup();

    slotCleanupMap.clear();
    slotNodesByName.clear();
  });

  return {
    elements: (name?: string) => ensureSlotEntry(normalizeSlotName(name)).elements,
    has: (name?: string) => ensureSlotEntry(normalizeSlotName(name)).presence,
  };
};
