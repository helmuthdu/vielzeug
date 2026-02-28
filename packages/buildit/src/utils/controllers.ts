/**
 * Reactive Controllers for buildit web components
 * Modern composition pattern (used by Lit and other frameworks)
 *
 * @module buildit/controllers
 */

/**
 * Controller host interface (web component)
 */
export interface ReactiveControllerHost extends HTMLElement {
  addController?(controller: ReactiveController): void;
  removeController?(controller: ReactiveController): void;
  requestUpdate?(): void;
}

/**
 * Base reactive controller interface
 */
export interface ReactiveController {
  hostConnected?(): void;
  hostDisconnected?(): void;
  hostUpdate?(): void;
}

/**
 * Form Field Controller
 * Handles all form validation logic using composition instead of inheritance
 *
 * @example
 * class BitInput extends HTMLElement {
 *   static formAssociated = true;
 *   private formField: FormFieldController;
 *
 *   constructor() {
 *     super();
 *     this.formField = new FormFieldController(this, {
 *       getInput: () => this.shadowRoot?.querySelector('input') ?? null
 *     });
 *   }
 *
 *   connectedCallback() {
 *     this.formField.hostConnected();
 *   }
 *
 *   // Use controller methods
 *   get validity() { return this.formField.validity; }
 *   checkValidity() { return this.formField.checkValidity(); }
 * }
 */
export class FormFieldController implements ReactiveController {
  private host: HTMLElement;
  private internals?: ElementInternals;
  private getInput: () => HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  private resetListener?: () => void;

  constructor(
    host: HTMLElement,
    options: {
      getInput: () => HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    },
  ) {
    this.host = host;
    this.getInput = options.getInput;

    // Attach ElementInternals if available
    if ('attachInternals' in host) {
      try {
        this.internals = (host as any).attachInternals();
      } catch (error) {
        console.debug('attachInternals failed:', error);
      }
    }
  }

  /**
   * Called when host is connected to the DOM
   */
  hostConnected(): void {
    // Setup form reset listener
    const form = this.host.closest('form');
    if (form) {
      this.resetListener = () => {
        requestAnimationFrame(() => {
          this.handleReset?.();
        });
      };
      form.addEventListener('reset', this.resetListener);
    }

    // Check for fieldset disabled
    const fieldset = this.host.closest('fieldset');
    if (fieldset?.hasAttribute('disabled')) {
      this.setFormDisabled(true);
    }
  }

  /**
   * Called when host is disconnected from the DOM
   */
  hostDisconnected(): void {
    if (this.resetListener) {
      const form = this.host.closest('form');
      form?.removeEventListener('reset', this.resetListener);
      this.resetListener = undefined;
    }
  }

  /**
   * Set custom validation message
   */
  setCustomValidity(message: string): void {
    if (!this.internals?.setValidity) {
      const input = this.getInput();
      input?.setCustomValidity(message);
      return;
    }

    if (message) {
      this.internals.setValidity({ customError: true }, message);
    } else {
      this.internals.setValidity({});
    }
  }

  /**
   * Check if valid without showing UI
   */
  checkValidity(): boolean {
    if (!this.internals?.checkValidity) {
      const input = this.getInput();
      return input?.checkValidity() ?? true;
    }
    return this.internals.checkValidity();
  }

  /**
   * Check validity and show UI
   */
  reportValidity(): boolean {
    if (!this.internals?.reportValidity) {
      const input = this.getInput();
      return input?.reportValidity() ?? true;
    }
    return this.internals.reportValidity();
  }

  /**
   * Get validity state
   */
  get validity(): ValidityState {
    if (!this.internals?.validity) {
      const input = this.getInput();
      return input?.validity ?? ({} as ValidityState);
    }
    return this.internals.validity;
  }

  /**
   * Get validation message
   */
  get validationMessage(): string {
    if (!this.internals?.validationMessage) {
      const input = this.getInput();
      return input?.validationMessage ?? '';
    }
    return this.internals.validationMessage;
  }

  /**
   * Update form value
   */
  setFormValue(value: string | File | FormData | null, state?: string | File | FormData | null): void {
    if (!this.internals?.setFormValue) return;
    this.internals.setFormValue(value, state);
  }

  /**
   * Update validity state
   */
  setValidity(flags: ValidityStateFlags = {}, message = ''): void {
    if (!this.internals?.setValidity) return;

    if (Object.keys(flags).length === 0 && !message) {
      this.internals.setValidity({});
    } else {
      this.internals.setValidity(flags, message);
    }
  }

  /**
   * Set form disabled state
   */
  setFormDisabled(disabled: boolean): void {
    (this.host as any).formDisabled = disabled;
  }

  /**
   * Override this to handle form reset
   */
  handleReset?(): void;
}

/**
 * Disabled State Controller
 * Manages disabled state and ARIA attributes
 */
export class DisabledController implements ReactiveController {
  private host: HTMLElement;
  private getInternalElement?: () => HTMLElement | null;

  constructor(
    host: HTMLElement,
    options?: {
      getInternalElement?: () => HTMLElement | null;
    },
  ) {
    this.host = host;
    this.getInternalElement = options?.getInternalElement;
  }

  get disabled(): boolean {
    return this.host.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    if (value) {
      this.host.setAttribute('disabled', '');
    } else {
      this.host.removeAttribute('disabled');
    }
    this.update();
  }

  /**
   * Update disabled state on internal elements
   */
  update(): void {
    const isDisabled = this.disabled;

    // Update ARIA
    this.host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    // Manage tabindex
    if (isDisabled) {
      this.host.setAttribute('tabindex', '-1');
    } else {
      if (!this.host.hasAttribute('tabindex')) {
        this.host.removeAttribute('tabindex');
      }
    }

    // Update internal element
    if (this.getInternalElement) {
      const element = this.getInternalElement();
      if (element && 'disabled' in element) {
        (element as any).disabled = isDisabled;
      }
    }
  }

  hostConnected(): void {
    this.update();
  }
}

/**
 * Focus Controller
 * Manages focus behavior and delegation
 */
export class FocusController implements ReactiveController {
  private host: HTMLElement;
  private getFocusableElement: () => HTMLElement | null;

  constructor(
    host: HTMLElement,
    options: {
      getFocusableElement: () => HTMLElement | null;
    },
  ) {
    this.host = host;
    this.getFocusableElement = options.getFocusableElement;
  }

  hostConnected(): void {
    // Set default tabindex if not set
    if (!this.host.hasAttribute('tabindex')) {
      this.host.setAttribute('tabindex', '0');
    }

    // Delegate focus to internal element
    this.host.addEventListener('focus', () => {
      const focusable = this.getFocusableElement();
      if (focusable && focusable !== this.host) {
        focusable.focus();
      }
    });
  }

  focus(options?: FocusOptions): void {
    const focusable = this.getFocusableElement();
    if (focusable) {
      focusable.focus(options);
    } else {
      this.host.focus(options);
    }
  }

  blur(): void {
    const focusable = this.getFocusableElement();
    if (focusable) {
      focusable.blur();
    } else {
      this.host.blur();
    }
  }
}

/**
 * Slot Observer Controller
 * Observes slot changes and calls handler
 */
export class SlotController implements ReactiveController {
  private host: HTMLElement;
  private slotName: string;
  private onChange: (elements: Element[]) => void;
  private slot?: HTMLSlotElement;

  constructor(
    host: HTMLElement,
    options: {
      name?: string;
      onChange: (elements: Element[]) => void;
    },
  ) {
    this.host = host;
    this.slotName = options.name || '';
    this.onChange = options.onChange;
  }

  hostConnected(): void {
    const shadowRoot = this.host.shadowRoot;
    if (!shadowRoot) return;

    this.slot = this.slotName
      ? (shadowRoot.querySelector(`slot[name="${this.slotName}"]`) as HTMLSlotElement)
      : (shadowRoot.querySelector('slot:not([name])') as HTMLSlotElement);

    if (this.slot) {
      const handleChange = () => {
        const elements = this.slot!.assignedElements({ flatten: true });
        this.onChange(elements);
      };

      this.slot.addEventListener('slotchange', handleChange);

      // Call immediately with current content
      handleChange();
    }
  }
}

/**
 * Resize Observer Controller
 * Observes element size changes
 */
export class ResizeController implements ReactiveController {
  private host: HTMLElement;
  private onResize: (entry: ResizeObserverEntry) => void;
  private observer?: ResizeObserver;

  constructor(
    host: HTMLElement,
    options: {
      onResize: (entry: ResizeObserverEntry) => void;
    },
  ) {
    this.host = host;
    this.onResize = options.onResize;
  }

  hostConnected(): void {
    if ('ResizeObserver' in window) {
      this.observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.onResize(entry);
        }
      });
      this.observer.observe(this.host);
    }
  }

  hostDisconnected(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}

/**
 * Intersection Observer Controller
 * Observes element visibility
 */
export class IntersectionController implements ReactiveController {
  private host: HTMLElement;
  private onIntersect: (entry: IntersectionObserverEntry) => void;
  private observer?: IntersectionObserver;
  private options: IntersectionObserverInit;

  constructor(
    host: HTMLElement,
    config: {
      onIntersect: (entry: IntersectionObserverEntry) => void;
      options?: IntersectionObserverInit;
    },
  ) {
    this.host = host;
    this.onIntersect = config.onIntersect;
    this.options = config.options || {};
  }

  hostConnected(): void {
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        this.onIntersect(entry);
      }
    }, this.options);
    this.observer.observe(this.host);
  }

  hostDisconnected(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}

/**
 * Checked State Controller
 * Manages checked state for checkbox, radio, and switch components
 *
 * @example
 * class BitCheckbox extends HTMLElement {
 *   private checkedState: CheckedStateController;
 *
 *   constructor() {
 *     super();
 *     this.checkedState = new CheckedStateController(this, {
 *       type: 'checkbox',
 *       getInput: () => this.shadowRoot?.querySelector('input') ?? null,
 *       onToggle: (checked) => {
 *         this.formField.setFormValue(checked ? 'on' : null);
 *       }
 *     });
 *   }
 *
 *   connectedCallback() {
 *     this.checkedState.hostConnected();
 *   }
 * }
 */
export class CheckedStateController implements ReactiveController {
  private host: HTMLElement;
  private type: 'checkbox' | 'radio' | 'switch';
  private getInput: () => HTMLInputElement | null;
  private onToggle?: (checked: boolean, value: string) => void;
  private onChange?: (checked: boolean, value: string, originalEvent: Event) => void;

  constructor(
    host: HTMLElement,
    config: {
      type: 'checkbox' | 'radio' | 'switch';
      getInput: () => HTMLInputElement | null;
      onToggle?: (checked: boolean, value: string) => void;
      onChange?: (checked: boolean, value: string, originalEvent: Event) => void;
    },
  ) {
    this.host = host;
    this.type = config.type;
    this.getInput = config.getInput;
    this.onToggle = config.onToggle;
    this.onChange = config.onChange;
  }

  hostConnected(): void {
    this.syncState();
  }

  /**
   * Sync checked state from attribute to internal input and ARIA
   */
  syncState(indeterminate = false): void {
    const input = this.getInput();
    const isChecked = this.host.hasAttribute('checked');
    const isDisabled = this.host.hasAttribute('disabled');

    // Sync internal input
    if (input) {
      input.checked = isChecked;
      if (this.type === 'checkbox' && 'indeterminate' in input) {
        input.indeterminate = indeterminate;
      }
    }

    // Set ARIA attributes
    const ariaChecked = this.type === 'checkbox' && indeterminate ? 'mixed' : isChecked ? 'true' : 'false';
    this.host.setAttribute('aria-checked', ariaChecked);
    this.host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    // Set role if not set
    if (!this.host.hasAttribute('role')) {
      this.host.setAttribute('role', this.type);
    }

    // Manage tabindex
    if (isDisabled) {
      this.host.removeAttribute('tabindex');
    } else if (!this.host.hasAttribute('tabindex')) {
      this.host.setAttribute('tabindex', '0');
    }
  }

  /**
   * Toggle checked state
   */
  toggle(originalEvent: Event): boolean {
    if (this.host.hasAttribute('disabled')) return false;

    const isChecked = this.host.hasAttribute('checked');
    const nextChecked = !isChecked;

    this.setChecked(nextChecked, originalEvent);

    return nextChecked;
  }

  /**
   * Set checked state
   */
  setChecked(checked: boolean, originalEvent?: Event): void {
    const input = this.getInput();
    const formValue =
      this.host.getAttribute('value') || (this.type === 'checkbox' || this.type === 'switch' ? 'on' : '');
    const eventValue = this.host.getAttribute('value');

    // Update attribute
    if (checked) {
      this.host.setAttribute('checked', '');
    } else {
      this.host.removeAttribute('checked');
    }

    // Clear indeterminate if checkbox
    if (this.type === 'checkbox' && this.host.hasAttribute('indeterminate')) {
      this.host.removeAttribute('indeterminate');
      if (input && 'indeterminate' in input) {
        input.indeterminate = false;
      }
    }

    // Sync internal input
    if (input) {
      input.checked = checked;
    }

    // Update ARIA
    this.host.setAttribute('aria-checked', checked ? 'true' : 'false');

    // Notify callbacks
    if (this.onToggle) {
      this.onToggle(checked, formValue);
    }

    // Dispatch change event
    if (originalEvent) {
      this.host.dispatchEvent(
        new CustomEvent('change', {
          bubbles: true,
          composed: true,
          detail: {
            checked,
            originalEvent,
            value: eventValue,
          },
        }),
      );

      if (this.onChange) {
        this.onChange(checked, formValue, originalEvent);
      }
    }
  }

  /**
   * Get current checked state
   */
  get isChecked(): boolean {
    return this.host.hasAttribute('checked');
  }

  /**
   * Get current value
   */
  get value(): string {
    return this.host.getAttribute('value') || (this.type === 'checkbox' || this.type === 'switch' ? 'on' : '');
  }
}
