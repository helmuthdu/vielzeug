import { createId } from '../internal';
import { defer, effect, onCleanup } from '../runtime';
import { createCheckableState, type CheckableStateHandle, type CheckableStateOptions } from './field-control';
import { createPressControl } from './press-control';

export type CheckableFieldControlOptions = CheckableStateOptions & {
  host: HTMLElement;
  onPress?: (control: CheckableStateHandle, originalEvent: Event) => void;
  role: 'checkbox' | 'radio' | 'switch';
};

export type CheckableFieldControlHandle = CheckableStateHandle & {
  handleClick: (event: MouseEvent) => boolean;
  handleKeydown: (event: KeyboardEvent) => boolean;
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

export const createCheckableFieldControl = (options: CheckableFieldControlOptions): CheckableFieldControlHandle => {
  const control = createCheckableState(options);
  const host = options.host;

  // Inline a11y control logic
  const labelId = createId('a11y-label');
  const helperId = createId('a11y-helper');

  const setAttr = (element: Element, name: string, value: string): void => {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  };

  const setText = (element: Node, value: string): void => {
    if (element.textContent !== value) element.textContent = value;
  };

  setAttr(host, 'role', options.role);

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

    const checked =
      options.role === 'checkbox' && control.indeterminate.value ? 'mixed' : control.checked.value ? 'true' : 'false';
    const invalid = !!control.assistive.value.errorText;
    const helperText = control.assistive.value.errorText || control.assistive.value.helperText;

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

        if (invalid) setAttr(helperElement, 'role', 'alert');
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
    setAttr(host, 'aria-checked', checked);

    // Sync invalid
    if (invalid) setAttr(host, 'aria-invalid', 'true');
    else host.removeAttribute('aria-invalid');
  };

  // Auto-sync ARIA with reactive state
  effect(() => {
    sync();
  });

  // Sync once after first render
  defer(() => sync());

  onCleanup(() => {
    for (const cleanup of slotCleanupByElement.values()) cleanup();
    slotCleanupByElement.clear();
  });

  const press = createPressControl({
    disabled: () => control.disabled.value,
    onPress: (originalEvent) => {
      if (options.onPress) {
        options.onPress(control, originalEvent);

        return;
      }

      control.toggle(originalEvent);
    },
  });

  return {
    ...control,
    handleClick: press.handleClick,
    handleKeydown: press.handleKeydown,
    helperId,
    labelId,
  };
};
