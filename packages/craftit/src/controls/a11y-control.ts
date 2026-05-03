import { createId } from '../internal';
import { currentElementOrThrow, effect, onCleanup, onMounted } from '../runtime';

export type A11yTone = 'default' | 'error';

export type A11yControlConfig = {
  checked?: () => 'true' | 'false' | 'mixed' | undefined;
  helperId?: string;
  helperText?: () => string | undefined;
  helperTone?: () => A11yTone;
  invalid?: () => boolean;
  labelId?: string;
  role: string;
};

export type A11yControlHandle = {
  helperId: string;
  labelId: string;
};

const hasLabelContent = (labelElement: HTMLElement): boolean => {
  const slot = labelElement.querySelector('slot');

  if (slot instanceof HTMLSlotElement) {
    return slot.assignedNodes({ flatten: true }).some((node) => (node.textContent?.trim().length ?? 0) > 0);
  }

  return (labelElement.textContent?.trim().length ?? 0) > 0;
};

export function createA11yControl(config: A11yControlConfig): A11yControlHandle {
  const host = currentElementOrThrow();
  const labelId = config.labelId || createId('a11y-label');
  const helperId = config.helperId || createId('a11y-helper');

  const setAttr = (element: Element, name: string, value: string): void => {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  };

  const setText = (element: Node, value: string): void => {
    if (element.textContent !== value) element.textContent = value;
  };

  setAttr(host, 'role', config.role);

  let cachedLabelEl: HTMLElement | null = null;
  let cachedHelperEl: HTMLDivElement | null = null;

  const getLabelElement = (): HTMLElement | null => {
    if (cachedLabelEl && cachedLabelEl.isConnected) return cachedLabelEl;

    cachedLabelEl = host.shadowRoot?.querySelector('[data-a11y-label]') as HTMLElement | null;

    return cachedLabelEl;
  };

  const getHelperElement = (): HTMLDivElement | null => {
    if (cachedHelperEl && cachedHelperEl.isConnected) return cachedHelperEl;

    cachedHelperEl = host.shadowRoot?.querySelector('[data-a11y-helper]') as HTMLDivElement | null;

    return cachedHelperEl;
  };

  const slotCleanupByElement = new Map<HTMLSlotElement, () => void>();

  const syncSlotListeners = (labelElement: HTMLElement | null, helperElement: HTMLDivElement | null): void => {
    const nextSlots = new Set<HTMLSlotElement>();

    for (const container of [labelElement, helperElement]) {
      if (!container) continue;

      for (const slot of Array.from(container.querySelectorAll('slot'))) {
        if (slot instanceof HTMLSlotElement) nextSlots.add(slot);
      }
    }

    for (const [slot, cleanup] of slotCleanupByElement) {
      if (nextSlots.has(slot)) continue;

      cleanup();
      slotCleanupByElement.delete(slot);
    }

    for (const slot of nextSlots) {
      if (slotCleanupByElement.has(slot)) continue;

      const slotHandler = () => sync();

      slot.addEventListener('slotchange', slotHandler);
      slotCleanupByElement.set(slot, () => slot.removeEventListener('slotchange', slotHandler));
    }
  };

  const sync = (): void => {
    const shadow = host.shadowRoot;

    if (!shadow) return;

    const labelElement = getLabelElement();
    const helperElement = getHelperElement();

    syncSlotListeners(labelElement, helperElement);

    const checked = config.checked?.();
    const invalid = config.invalid?.();
    const helperText = config.helperText?.();

    // Sync label
    if (labelElement) {
      if (labelElement.id !== labelId) labelElement.id = labelId;

      if (hasLabelContent(labelElement)) setAttr(host, 'aria-labelledby', labelId);
      else host.removeAttribute('aria-labelledby');
    } else {
      host.removeAttribute('aria-labelledby');
    }

    // Sync helper
    if (helperElement) {
      if (helperElement.id !== helperId) helperElement.id = helperId;

      if (helperText) {
        setText(helperElement, helperText);

        if (helperElement.hidden) helperElement.hidden = false;

        setAttr(host, 'aria-describedby', helperId);

        if ((config.helperTone?.() ?? 'default') === 'error') setAttr(helperElement, 'role', 'alert');
        else helperElement.removeAttribute('role');
      } else {
        setText(helperElement, '');

        if (!helperElement.hidden) helperElement.hidden = true;

        helperElement.removeAttribute('role');
        host.removeAttribute('aria-describedby');
      }
    } else {
      host.removeAttribute('aria-describedby');
    }

    // Sync checked
    if (checked === undefined) host.removeAttribute('aria-checked');
    else setAttr(host, 'aria-checked', checked);

    // Sync invalid
    if (invalid === undefined) host.removeAttribute('aria-invalid');
    else setAttr(host, 'aria-invalid', String(invalid));
  };

  // Keep ARIA in sync with reactive config changes.
  effect(() => {
    sync();
  });

  // Sync once after first render — DOM elements are not yet available during setup.
  onMounted(() => sync());

  onCleanup(() => {
    for (const cleanup of slotCleanupByElement.values()) cleanup();
    slotCleanupByElement.clear();
  });

  return { helperId, labelId };
}
