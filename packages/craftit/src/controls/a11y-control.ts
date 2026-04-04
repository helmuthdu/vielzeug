import { createId } from '../internal';
import { effect, onCleanup, onMount } from '../runtime-lifecycle';

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

export function createA11yControl(host: HTMLElement, config: A11yControlConfig): A11yControlHandle {
  const labelId = config.labelId || createId('a11y-label');
  const helperId = config.helperId || createId('a11y-helper');

  const setAttr = (element: Element, name: string, value: string): void => {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  };

  const setText = (element: Node, value: string): void => {
    if (element.textContent !== value) element.textContent = value;
  };

  setAttr(host, 'role', config.role);

  const sync = (): void => {
    const shadow = host.shadowRoot;

    if (!shadow) return;

    const labelElement = shadow.querySelector('[data-a11y-label]') as HTMLElement | null;
    const helperElement = shadow.querySelector('[data-a11y-helper]') as HTMLDivElement | null;
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

  // Effect for reactive config changes
  effect(() => {
    sync();
  });

  // Watch for DOM mutations to label/helper content (slot changes, etc.)
  onMount(() => {
    const shadow = host.shadowRoot;

    if (!shadow) return;

    sync();

    const labelElement = shadow.querySelector('[data-a11y-label]') as HTMLElement | null;
    const helperElement = shadow.querySelector('[data-a11y-helper]') as HTMLElement | null;

    const elementsToWatch = [labelElement, helperElement].filter(Boolean) as HTMLElement[];

    if (elementsToWatch.length === 0) return;

    const observer = new MutationObserver(() => {
      sync();
    });

    // Watch label and helper elements for content changes (including slot changes)
    elementsToWatch.forEach((el) => {
      observer.observe(el, { characterData: true, childList: true, subtree: true });

      // Also listen for slotchange event to catch slot content updates
      const slot = el.querySelector('slot') as HTMLSlotElement | null;

      if (slot) {
        const slotHandler = () => sync();

        slot.addEventListener('slotchange', slotHandler);
        onCleanup(() => slot.removeEventListener('slotchange', slotHandler));
      }
    });

    onCleanup(() => observer.disconnect());
  });

  return { helperId, labelId };
}
