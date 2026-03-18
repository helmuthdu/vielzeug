/**
 * Property Binding Tests
 * Tests for the .property syntax that binds to element properties (e.g. .value, .checked)
 */

import { computed, define, html, signal } from '..';
import { fire, mount } from '../test';

describe('Property Binding: .property syntax', () => {
  describe('Text input .value binding', () => {
    it('should set initial value property from signal', async () => {
      define('test-prop-value', () => {
        const text = signal('hello');

        return html`<input type="text" .value=${text} />`;
      });

      const { query } = await mount('test-prop-value');

      const input = query<HTMLInputElement>('input');

      expect(input?.value).toBe('hello');
    });

    it('should update property when signal changes', async () => {
      define('test-prop-value-reactive', () => {
        const text = signal('hello');

        return html`
          <div>
            <button @click=${() => (text.value = 'world')}>Update</button>
            <input type="text" .value=${text} />
          </div>
        `;
      });

      const { query } = await mount('test-prop-value-reactive');

      const input = query('input') as HTMLInputElement;
      const button = query('button');

      expect(input.value).toBe('hello');

      fire.click(button!);
      await new Promise((r) => setTimeout(r, 10));

      expect(input.value).toBe('world');
    });

    it('should support computed values', async () => {
      define('test-prop-computed', () => {
        const first = signal('hello');
        const last = signal('world');
        const fullName = computed(() => `${first.value} ${last.value}`);

        return html`<input type="text" .value=${fullName} />`;
      });

      const { query } = await mount('test-prop-computed');

      const input = query('input') as HTMLInputElement;

      expect(input.value).toBe('hello world');
    });

    it('should support static values', async () => {
      define('test-prop-static', () => {
        return html`<input type="text" .value=${'static value'} />`;
      });

      const { query } = await mount('test-prop-static');

      const input = query('input') as HTMLInputElement;

      expect(input.value).toBe('static value');
    });

    it('should update source signal when input emits an input event', async () => {
      const text = signal('hello');

      define('test-prop-value-two-way', () => {
        return html`<input type="text" .value=${text} />`;
      });

      const { query } = await mount('test-prop-value-two-way');
      const input = query('input') as HTMLInputElement;

      input.value = 'changed';
      input.dispatchEvent(new Event('input'));

      expect(text.value).toBe('changed');
    });
  });

  describe('Checkbox .checked binding', () => {
    it('should set checkbox checked property from signal', async () => {
      define('test-prop-checked', () => {
        const checked = signal(true);

        return html`<input type="checkbox" .checked=${checked} />`;
      });

      const { query } = await mount('test-prop-checked');

      const checkbox = query('input') as HTMLInputElement;

      expect(checkbox.checked).toBe(true);
    });

    it('should update checked property when signal changes', async () => {
      define('test-prop-checked-reactive', () => {
        const checked = signal(false);

        return html`
          <div>
            <button @click=${() => (checked.value = true)}>Check</button>
            <input type="checkbox" .checked=${checked} />
          </div>
        `;
      });

      const { query } = await mount('test-prop-checked-reactive');

      const checkbox = query('input') as HTMLInputElement;
      const button = query('button');

      expect(checkbox.checked).toBe(false);

      fire.click(button!);
      await new Promise((r) => setTimeout(r, 10));

      expect(checkbox.checked).toBe(true);
    });

    it('should support computed values for checked', async () => {
      define('test-prop-checked-computed', () => {
        const value = signal(5);
        const isGreaterThanTen = computed(() => value.value > 10);

        return html`<input type="checkbox" .checked=${isGreaterThanTen} />`;
      });

      const { query } = await mount('test-prop-checked-computed');

      const checkbox = query('input') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);
    });

    it('should update source signal when checked changes', async () => {
      const checked = signal(false);

      define('test-prop-checked-two-way', () => {
        return html`<input type="checkbox" .checked=${checked} />`;
      });

      const { query } = await mount('test-prop-checked-two-way');
      const checkbox = query('input') as HTMLInputElement;

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      expect(checked.value).toBe(true);
    });
  });

  describe('Custom element property binding', () => {
    it('should bind to custom element properties', async () => {
      define('custom-prop-element', () => {
        return html`<div></div>`;
      });

      define('test-custom-prop', () => {
        const data = signal({ name: 'test', value: 42 });

        return html`<custom-prop-element .data=${data} />`;
      });

      const { query } = await mount('test-custom-prop');

      const customEl = query('custom-prop-element') as any;

      expect(customEl.data).toEqual({ name: 'test', value: 42 });
    });

    it('should update custom properties reactively', async () => {
      define('custom-prop-reactive', () => {
        return html`<div></div>`;
      });

      define('test-custom-reactive', () => {
        const data = signal({ count: 1 });

        return html`
          <div>
            <button @click=${() => (data.value = { count: 2 })}>Update</button>
            <custom-prop-reactive .data=${data} />
          </div>
        `;
      });

      const { query } = await mount('test-custom-reactive');

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
      define('test-attr-prop-combo', () => {
        const value = signal('hello');
        const disabled = signal(false);

        return html`<input type="text" .value=${value} ?disabled=${disabled} />`;
      });

      const { query } = await mount('test-attr-prop-combo');

      const input = query('input') as HTMLInputElement;

      expect(input.value).toBe('hello');
      expect(input.disabled).toBe(false);
    });
  });
});
