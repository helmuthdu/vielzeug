/**
 * Shared utilities for checkable form controls (checkbox, radio, switch)
 *
 * Reduces code duplication by providing common functionality for:
 * - ARIA attribute management
 * - Keyboard event handling
 * - Focus management
 * - Toggle behavior
 */

import type { WebComponent } from '@vielzeug/craftit';

export interface CheckableConfig {
  /** ARIA role for the control */
  role: 'checkbox' | 'radio' | 'switch';
  /** Whether control supports indeterminate state (checkbox only) */
  supportsIndeterminate?: boolean;
  /** Custom toggle handler */
  onToggle?: (el: WebComponent, checked: boolean, event: Event) => void;
}

/**
 * Sync checked state to ARIA and input
 */
function syncChecked(host: HTMLElement, newValue: string | null) {
  const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
  const isChecked = newValue !== null;

  if (input) {
    input.checked = isChecked;
  }

  if (!host.hasAttribute('indeterminate')) {
    host.setAttribute('aria-checked', isChecked ? 'true' : 'false');
  }
}

/**
 * Sync indeterminate state to ARIA and input
 */
function syncIndeterminate(host: HTMLElement, newValue: string | null) {
  const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
  const isIndeterminate = newValue !== null;

  if (input) {
    input.indeterminate = isIndeterminate;
  }

  host.setAttribute('aria-checked', isIndeterminate ? 'mixed' : host.hasAttribute('checked') ? 'true' : 'false');
}

/**
 * Sync disabled state to ARIA and tabindex
 */
function syncDisabled(host: HTMLElement, newValue: string | null) {
  const isDisabled = newValue !== null;
  host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

  // Manage tabindex
  if (isDisabled) {
    host.removeAttribute('tabindex');
  } else if (!host.hasAttribute('tabindex')) {
    host.setAttribute('tabindex', '0');
  }
}

/**
 * Setup ARIA attributes for checkable controls
 */
export function syncCheckableARIA(host: HTMLElement, name: string, newValue: string | null, config: CheckableConfig) {
  if (name === 'checked') {
    syncChecked(host, newValue);
  } else if (name === 'indeterminate' && config.supportsIndeterminate) {
    syncIndeterminate(host, newValue);
  } else if (name === 'disabled') {
    syncDisabled(host, newValue);
  }
}

/**
 * Initialize checkable control with proper ARIA and role
 */
export function initializeCheckable(host: HTMLElement, config: CheckableConfig) {
  const isIndeterminate = config.supportsIndeterminate && host.hasAttribute('indeterminate');
  const isChecked = host.hasAttribute('checked');
  const isDisabled = host.hasAttribute('disabled');

  // Sync internal input if present
  const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
  if (input) {
    input.checked = isChecked;
    if (config.supportsIndeterminate && isIndeterminate !== undefined) {
      input.indeterminate = isIndeterminate;
    }
  }

  // Set ARIA attributes
  host.setAttribute('role', config.role);
  host.setAttribute('aria-checked', isIndeterminate ? 'mixed' : isChecked ? 'true' : 'false');
  host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

  if (!isDisabled && !host.hasAttribute('tabindex')) {
    host.setAttribute('tabindex', '0');
  }
}

/**
 * Create toggle handler for checkable controls
 */
export function createToggleHandler(el: WebComponent, config: CheckableConfig) {
  return (originalEvent: Event) => {
    const host = el as unknown as HTMLElement;

    if (host.hasAttribute('disabled')) {
      return;
    }

    const nextChecked = !host.hasAttribute('checked');

    // Update checked state
    if (nextChecked) {
      host.setAttribute('checked', '');
    } else {
      host.removeAttribute('checked');
    }

    // Clear indeterminate if supported
    if (config.supportsIndeterminate && host.hasAttribute('indeterminate')) {
      host.removeAttribute('indeterminate');
    }

    // Sync internal input
    const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (input) {
      input.checked = nextChecked;
      if (config.supportsIndeterminate) {
        input.indeterminate = false;
      }
    }

    // Update ARIA
    host.setAttribute('aria-checked', nextChecked ? 'true' : 'false');

    // Call custom handler or emit change event
    if (config.onToggle) {
      config.onToggle(el, nextChecked, originalEvent);
    } else {
      el.emit('change', {
        checked: nextChecked,
        originalEvent,
        value: host.getAttribute('value'),
      });
    }
  };
}

/**
 * Setup keyboard navigation for checkable controls
 */
export function setupCheckableKeyboard(el: WebComponent, toggleHandler: (event: Event) => void) {
  el.on('keydown', (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggleHandler(event);
    }
  });
}

/**
 * Setup click handling for checkable controls
 */
export function setupCheckableClick(el: WebComponent, toggleHandler: (event: Event) => void) {
  el.on('click', toggleHandler);
}

/**
 * All-in-one setup for checkable controls
 *
 * @example
 * ```typescript
 * onConnected(el) {
 *   setupCheckableControl(el, {
 *     role: 'checkbox',
 *     supportsIndeterminate: true,
 *   });
 * }
 * ```
 */
export function setupCheckableControl(el: WebComponent, config: CheckableConfig) {
  const host = el as unknown as HTMLElement;

  // Initialize ARIA
  initializeCheckable(host, config);

  // Create toggle handler
  const toggleHandler = createToggleHandler(el, config);

  // Setup keyboard
  setupCheckableKeyboard(el, toggleHandler);

  // Setup click
  setupCheckableClick(el, toggleHandler);

  return {
    syncARIA: (name: string, value: string | null) => syncCheckableARIA(host, name, value, config),
    toggleHandler,
  };
}
