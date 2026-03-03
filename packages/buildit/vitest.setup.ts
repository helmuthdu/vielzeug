import { afterEach, vi } from 'vitest';
import { install } from '@vielzeug/craftit/test';

// Polyfill ElementInternals for jsdom — jsdom does not implement form-associated
// custom element APIs like setFormValue, setValidity, states, etc.
if (typeof ElementInternals !== 'undefined') {
  const proto = ElementInternals.prototype as any;
  if (!proto.setFormValue) proto.setFormValue = () => {};
  if (!proto.setValidity) proto.setValidity = () => {};
  if (!proto.checkValidity) proto.checkValidity = () => true;
  if (!proto.reportValidity) proto.reportValidity = () => true;
  if (!proto.states) {
    Object.defineProperty(proto, 'states', {
      get() {
        if (!this._states) {
          const s = new Set<string>();
          this._states = { add: (v: string) => s.add(v), delete: (v: string) => s.delete(v), has: (v: string) => s.has(v) };
        }
        return this._states;
      },
    });
  }
}

install(afterEach);

globalThis.window.URL.createObjectURL = vi.fn();
