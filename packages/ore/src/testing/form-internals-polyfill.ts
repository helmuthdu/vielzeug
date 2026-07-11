import { walkFlatTree } from './dom';

/**
 * jsdom implements none of the `ElementInternals` form-association API — not `setFormValue`,
 * not `setValidity`, not the `checkValidity`/`reportValidity`/`validity`/`validationMessage`
 * mixin real browsers put on every `formAssociated: true` element, not even `FormData`
 * collecting a form-associated element's set value, or `<form>.reset()` invoking
 * `formResetCallback()`. Every one of those gaps is exercised by `useField()` (`@vielzeug/ore/forms`),
 * so any package testing a form-associated component needs all of them, not just one — this is
 * called once, automatically, by `install()`.
 *
 * Deliberately lives here rather than in each consuming package's own `vitest.setup.ts`: the
 * gap is in `ore`'s own form-association feature, not in any one consumer, so the fix belongs
 * with the feature. `@vielzeug/refine`'s `<ore-form>` adds one more wrinkle on top — its fields
 * are slotted into a shadow `<form>` — which `walkFlatTree` already handles here, so refine
 * doesn't need a second, package-local copy of this polyfill at all.
 */
export const installFormInternalsPolyfill = (): void => {
  // Checked *before* consuming the flag below — an environment without `ElementInternals`
  // installs nothing and should stay eligible to install for real later (e.g. a differently
  // configured environment in the same process), not get marked "already installed" for having
  // done nothing.
  if (typeof ElementInternals === 'undefined') return;

  const INSTALLED_FLAG = Symbol.for('vielzeug.ore.testing.formInternalsPolyfillInstalled');
  const flagHost = globalThis as Record<symbol, boolean | undefined>;

  if (flagHost[INSTALLED_FLAG]) return;

  flagHost[INSTALLED_FLAG] = true;

  const proto = ElementInternals.prototype as unknown as Record<string, unknown>;
  const validityState = new WeakMap<ElementInternals, { flags: ValidityStateFlags; message: string }>();
  const formValueByHost = new WeakMap<HTMLElement, File | FormData | string | null>();
  const hostByInternals = new WeakMap<ElementInternals, HTMLElement>();

  const isValid = (internals: ElementInternals): boolean => {
    const state = validityState.get(internals);

    return !state || !Object.values(state.flags).some(Boolean);
  };

  if (!('setFormValue' in proto)) {
    Object.defineProperty(proto, 'setFormValue', {
      configurable: true,
      value: function (this: ElementInternals, value: File | FormData | string | null) {
        const host = hostByInternals.get(this);

        if (host) formValueByHost.set(host, value);
      },
      writable: true,
    });
  }

  if (!('setValidity' in proto)) {
    Object.defineProperty(proto, 'setValidity', {
      configurable: true,
      // Matches the real platform contract: throws if any flag is true and message is empty.
      // `useField()` itself already guards against triggering this — see forms/field.ts — but
      // the polyfill enforcing it too means a test would still catch a *different* caller doing
      // the same thing wrong, instead of that bug only surfacing in a real browser.
      value: function (this: ElementInternals, flags: ValidityStateFlags = {}, message = '') {
        if (Object.values(flags).some(Boolean) && !message) {
          throw new TypeError(
            "Failed to execute 'setValidity' on 'ElementInternals': The second argument must not be empty if " +
              'one or more flags in the first argument are true.',
          );
        }

        validityState.set(this, { flags, message });
      },
      writable: true,
    });
  }

  if (!('checkValidity' in proto)) {
    Object.defineProperty(proto, 'checkValidity', {
      configurable: true,
      value: function (this: ElementInternals) {
        return isValid(this);
      },
      writable: true,
    });
  }

  if (!('reportValidity' in proto)) {
    Object.defineProperty(proto, 'reportValidity', {
      configurable: true,
      value: function (this: ElementInternals) {
        return isValid(this);
      },
      writable: true,
    });
  }

  if (!('validationMessage' in proto)) {
    Object.defineProperty(proto, 'validationMessage', {
      configurable: true,
      get(this: ElementInternals) {
        return isValid(this) ? '' : (validityState.get(this)?.message ?? '');
      },
    });
  }

  if (!('states' in proto)) {
    Object.defineProperty(proto, 'states', {
      configurable: true,
      get: function (this: ElementInternals & { _states?: Set<string> }) {
        this._states ??= new Set();

        return this._states;
      },
    });
  }

  // Real browsers mix `checkValidity`/`reportValidity`/`validity`/`validationMessage` onto any
  // `formAssociated: true` custom element itself (delegating to its internals) — not just onto
  // `ElementInternals`. jsdom does neither; mirror it here so a component's own
  // `checkValidity()`/`reportValidity()`, and a test asserting against the element directly,
  // behave the same as they would in a real browser.
  const originalAttachInternals = HTMLElement.prototype.attachInternals;

  HTMLElement.prototype.attachInternals = function (this: HTMLElement, ...args: []): ElementInternals {
    const internals = originalAttachInternals.apply(this, args);

    hostByInternals.set(internals, this);

    Object.defineProperties(this, {
      checkValidity: { configurable: true, value: () => internals.checkValidity() },
      reportValidity: { configurable: true, value: () => internals.reportValidity() },
      validationMessage: { configurable: true, get: () => internals.validationMessage },
      validity: { configurable: true, get: () => internals.validity },
    });

    return internals;
  };

  const appendFormValue = (formData: FormData, name: string, value: File | FormData | string): void => {
    if (value instanceof FormData) {
      for (const [entryName, entryValue] of value.entries()) formData.append(entryName, entryValue);

      return;
    }

    formData.append(name, value);
  };

  // jsdom's `FormData` constructor never collects a form-associated custom element's set form
  // value — real browsers walk the flat tree for every form-associated element with a `name`.
  const NativeFormData = globalThis.FormData;

  globalThis.FormData = class FormDataWithFormAssociatedElements extends NativeFormData {
    constructor(form?: HTMLFormElement, submitter?: HTMLElement | null) {
      super(form as HTMLFormElement | undefined, submitter as HTMLElement | null | undefined);

      if (!(form instanceof HTMLFormElement)) return;

      walkFlatTree(form, (element) => {
        const name = element.getAttribute('name');
        const value = formValueByHost.get(element);

        if (!name || value == null || element.hasAttribute('disabled')) return;

        appendFormValue(this, name, value);
      });
    }
  };

  // jsdom never invokes the native `formResetCallback` lifecycle method on form-associated
  // custom elements when their form resets — patch `reset()` to do it (via the same flat-tree
  // walk, since a reset field can be nested behind a shadow boundary too), so `onFormReset()`
  // (see `@vielzeug/ore`'s runtime.ts) is testable against a real `<form>.reset()` call instead
  // of only by calling `element.formResetCallback()` directly.
  const originalReset = HTMLFormElement.prototype.reset;

  HTMLFormElement.prototype.reset = function (this: HTMLFormElement, ...args: []) {
    originalReset.apply(this, args);

    walkFlatTree(this, (element) => {
      (element as Partial<{ formResetCallback: () => void }>).formResetCallback?.();
    });
  };
};
