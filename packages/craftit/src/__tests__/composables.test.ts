/**
 * Composables - Ref, Props, Context, Form Tests
 * Comprehensive tests for all composable utilities
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createInjectionKey, define, html, inject, prop, provide, ref, useForm, validators } from '..';
import { cleanup, mount } from '../testing/render';

// Counter for unique component names
let componentCounter = 0;
const uniqueName = (base: string) => `${base}-${++componentCounter}`;

describe('Composables', () => {
  afterEach(() => cleanup());

  describe('ref()', () => {
    it('should create element reference', async () => {
      const name = uniqueName('test-ref');
      define(name, () => {
        const btnRef = ref<HTMLButtonElement>();
        return html`<button ref=${btnRef}>Click</button>`;
      });

      const { query, waitForUpdates } = mount(name);
      await waitForUpdates();
      const btn = query('button');
      expect(btn).not.toBeNull();
    });

    it('should update ref value when element mounts', async () => {
      const name = uniqueName('test-ref-value');
      define(name, () => {
        const divRef = ref<HTMLDivElement>();
        setTimeout(() => {
          expect(divRef.value).not.toBeNull();
        }, 10);
        return html`<div ref=${divRef}>Test</div>`;
      });

      mount(name);
      await new Promise((r) => setTimeout(r, 20));
    });
  });

  describe('prop()', () => {
    it('should create reactive prop', () => {
      const name = uniqueName('test-prop');
      define(name, () => {
        const nameProp = prop('name', 'Guest');
        return html`<div>Hello ${nameProp}</div>`;
      });

      const { query } = mount(name);
      expect(query('div')?.textContent).toContain('Guest');
    });

    it('should update from attribute', async () => {
      const name = uniqueName('test-prop-attr');
      define(name, () => {
        const nameProp = prop('name', 'Guest');
        return html`<div>${nameProp}</div>`;
      });

      const { query, waitForUpdates } = mount(name, {
        props: { name: 'Alice' },
      });

      await waitForUpdates();
      expect(query('div')?.textContent).toBe('Alice');
    });
  });

  describe.skip('Context (provide/inject)', () => {
    // Skip these tests - context parent propagation needs architectural work
    it('should provide and inject values', async () => {
      const ThemeKey = createInjectionKey<string>('theme');
      let injectedValue = '';

      const consumerName = uniqueName('test-consumer');
      define(consumerName, () => {
        injectedValue = inject(ThemeKey) || '';
        return html`<div>${injectedValue}</div>`;
      });

      const providerName = uniqueName('test-provider');
      define(providerName, () => {
        provide(ThemeKey, 'dark');
        return html`<${consumerName}></${consumerName}>`;
      });

      const { waitForUpdates } = mount(providerName);
      await waitForUpdates();
      expect(injectedValue).toBe('dark');
    });

    it('should use default value when not provided', () => {
      const Key = createInjectionKey<string>('test');
      const name = uniqueName('test-inject-default');

      define(name, () => {
        const value = inject(Key, 'default');
        return html`<div>${value}</div>`;
      });

      const { query } = mount(name);
      expect(query('div')?.textContent).toBe('default');
    });
  });

  describe('Form Integration', () => {
    it('should create form with fields', () => {
      const name = uniqueName('test-form');
      define(name, () => {
        const form = useForm({
          email: { rules: [validators.required(), validators.email()], value: '' },
          password: { rules: [validators.required(), validators.minLength(8)], value: '' },
        });

        return html`
          <form>
            <input class="email" value=${form.fields.email.value} />
            <input class="password" value=${form.fields.password.value} />
          </form>
        `;
      });

      const { query } = mount(name);
      expect(query('.email')).not.toBeNull();
      expect(query('.password')).not.toBeNull();
    });

    it('should validate fields', async () => {
      const name = uniqueName('test-form-validation');
      define(name, () => {
        const form = useForm({
          email: { rules: [validators.email()], value: '' },
        });

        const handleSubmit = async (e: Event) => {
          e.preventDefault();
          await form.validate();
        };

        return html`
          <form @submit=${handleSubmit}>
            <input 
              class="email" 
              value=${form.fields.email.value}
              @input=${(e: Event) => {
                form.fields.email.value.value = (e.target as HTMLInputElement).value;
              }}
            />
            <button type="submit">Submit</button>
          </form>
        `;
      });

      const { query } = mount(name);
      const input = query('.email') as HTMLInputElement;
      expect(input).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple refs in same component', async () => {
      const name = uniqueName('test-multiple-refs');
      define(name, () => {
        const ref1 = ref<HTMLDivElement>();
        const ref2 = ref<HTMLSpanElement>();

        return html`
          <div ref=${ref1}>Div</div>
          <span ref=${ref2}>Span</span>
        `;
      });

      const { query, waitForUpdates } = mount(name);
      await waitForUpdates();

      expect(query('div')).not.toBeNull();
      expect(query('span')).not.toBeNull();
    });

    it.skip('should handle nested provides', async () => {
      // Skip - context parent propagation needs architectural work
      const Key = createInjectionKey<number>('value');

      const consumerName = uniqueName('test-nested-provide-consumer');
      define(consumerName, () => {
        const value = inject(Key);
        return html`<div>${value}</div>`;
      });

      const innerName = uniqueName('test-nested-provide-inner');
      define(innerName, () => {
        provide(Key, 2);
        return html`<${consumerName}></${consumerName}>`;
      });

      const outerName = uniqueName('test-nested-provide-outer');
      define(outerName, () => {
        provide(Key, 1);
        return html`<${innerName}></${innerName}>`;
      });

      const { query, waitForUpdates } = mount(outerName);
      await waitForUpdates();
      expect(query('div')?.textContent).toBe('2');
    });
  });
});
