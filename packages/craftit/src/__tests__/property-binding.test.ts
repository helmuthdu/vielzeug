/**
 * Property Binding Tests
 * Tests for the .property syntax that binds to element properties (e.g. .value, .checked)
 */

import { computed, defineComponent, html, signal } from '..';
import { fire, mount } from '../test';

describe('Property Binding: .property syntax', () => {
  describe('Text input .value binding', () => {
    it('should set initial value property from signal', async () => {
      const { query } = await mount(() => {
        const text = signal('hello');

        return html`<input type="text" .value=${text} />`;
      });

      const input = query<HTMLInputElement>('input');

      expect(input?.value).toBe('hello');
    });

    it('should update property when signal changes', async () => {
      const { query } = await mount(() => {
        const text = signal('hello');

        return html`
          <div>
            <button @click=${() => (text.value = 'world')}>Update</button>
            <input type="text" .value=${text} />
          </div>
        `;
      });

      const input = query('input') as HTMLInputElement;
      const button = query('button');

      expect(input.value).toBe('hello');

      fire.click(button!);
      await new Promise((r) => setTimeout(r, 10));

      expect(input.value).toBe('world');
    });

    it('should support computed values', async () => {
      const { query } = await mount(() => {
        const first = signal('hello');
        const last = signal('world');
        const fullName = computed(() => `${first.value} ${last.value}`);

        return html`<input type="text" .value=${fullName} />`;
      });

      const input = query('input') as HTMLInputElement;

      expect(input.value).toBe('hello world');
    });

    it('should support static values', async () => {
      const { query } = await mount(() => html`<input type="text" .value=${'static value'} />`);

      const input = query('input') as HTMLInputElement;

      expect(input.value).toBe('static value');
    });

    it('should update source signal when input emits an input event', async () => {
      const text = signal('hello');

      const { query } = await mount(() => html`<input type="text" .value=${text} />`);
      const input = query('input') as HTMLInputElement;

      input.value = 'changed';
      input.dispatchEvent(new Event('input'));

      expect(text.value).toBe('changed');
    });
  });

  describe('Checkbox .checked binding', () => {
    it('should set checkbox checked property from signal', async () => {
      const { query } = await mount(() => {
        const checked = signal(true);

        return html`<input type="checkbox" .checked=${checked} />`;
      });

      const checkbox = query('input') as HTMLInputElement;

      expect(checkbox.checked).toBe(true);
    });

    it('should update checked property when signal changes', async () => {
      const { query } = await mount(() => {
        const checked = signal(false);

        return html`
          <div>
            <button @click=${() => (checked.value = true)}>Check</button>
            <input type="checkbox" .checked=${checked} />
          </div>
        `;
      });

      const checkbox = query('input') as HTMLInputElement;
      const button = query('button');

      expect(checkbox.checked).toBe(false);

      fire.click(button!);
      await new Promise((r) => setTimeout(r, 10));

      expect(checkbox.checked).toBe(true);
    });

    it('should support computed values for checked', async () => {
      const { query } = await mount(() => {
        const value = signal(5);
        const isGreaterThanTen = computed(() => value.value > 10);

        return html`<input type="checkbox" .checked=${isGreaterThanTen} />`;
      });

      const checkbox = query('input') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);
    });

    it('should update source signal when checked changes', async () => {
      const checked = signal(false);

      const { query } = await mount(() => html`<input type="checkbox" .checked=${checked} />`);
      const checkbox = query('input') as HTMLInputElement;

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      expect(checked.value).toBe(true);
    });
  });

  describe('Custom element property binding', () => {
    it('should bind to custom element properties', async () => {
      defineComponent({ setup: () => html`<div></div>`, tag: 'custom-prop-element' });

      const { query } = await mount(() => {
        const data = signal({ name: 'test', value: 42 });

        return html`<custom-prop-element .data=${data} />`;
      });

      const customEl = query('custom-prop-element') as any;

      expect(customEl.data).toEqual({ name: 'test', value: 42 });
    });

    it('should update custom properties reactively', async () => {
      defineComponent({ setup: () => html`<div></div>`, tag: 'custom-prop-reactive' });

      const { query } = await mount(() => {
        const data = signal({ count: 1 });

        return html`
          <div>
            <button @click=${() => (data.value = { count: 2 })}>Update</button>
            <custom-prop-reactive .data=${data} />
          </div>
        `;
      });

      const customEl = query('custom-prop-reactive') as any;
      const button = query('button');

      expect(customEl.data).toEqual({ count: 1 });

      fire.click(button!);
      await new Promise((r) => setTimeout(r, 10));

      expect(customEl.data).toEqual({ count: 2 });
    });
  });

  describe('Interaction with attribute bindings', () => {
    it('should allow both attribute and property bindings on same element', async () => {
      const { query } = await mount(() => {
        const value = signal('hello');
        const disabled = signal(false);

        return html`<input type="text" .value=${value} ?disabled=${disabled} />`;
      });

      const input = query('input') as HTMLInputElement;

      expect(input.value).toBe('hello');
      expect(input.disabled).toBe(false);
    });
  });
});
