import { createId } from '@vielzeug/craftit';
import { getCurrentElement, effect, onCleanup, onMounted } from '@vielzeug/craftit';

export type A11yTone = 'default' | 'error';

export type A11yControlConfig = {
  checked?: () => 'true' | 'false' | 'mixed' | undefined;
  /** Getter for the helper/error text element in the component's shadow DOM. */
  getHelperEl: () => HTMLElement | null;
  /** Getter for the label element in the component's shadow DOM. */
  getLabelEl: () => HTMLElement | null;
  helperText?: () => string | undefined;
  helperTone?: () => A11yTone;
  invalid?: () => boolean;
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
  const host = getCurrentElement();
  const labelId = createId('a11y-label');
  const helperId = createId('a11y-helper');

  const setAttr = (element: Element, name: string, value: string): void => {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  };

  const setText = (element: Node, value: string): void => {
    if (element.textContent !== value) element.textContent = value;
  };

  setAttr(host, 'role', config.role);

  const sync = (): void => {
    const labelElement = config.getLabelEl();
    const helperElement = config.getHelperEl();

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

  // Sync once after first render, then watch slot changes.
  onMounted(() => {
    host.shadowRoot?.addEventListener('slotchange', sync);
    sync();
  });

  onCleanup(() => {
    host.shadowRoot?.removeEventListener('slotchange', sync);
  });

  return { helperId, labelId };
}
