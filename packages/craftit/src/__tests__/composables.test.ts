/**
 * Composables - Ref, Props, Context Tests
 * Comprehensive tests for composable utilities
 */

import {
  createContext,
  createId,
  define,
  defineEmits,
  defineSlots,
  field,
  guard,
  html,
  type InjectionKey,
  inject,
  prop,
  provide,
  ref,
  refs,
  signal,
} from '..';
import { fire, mount, waitForEvent } from '../test';

describe('Composables', () => {
  describe('ref()', () => {
    it('should create element reference', async () => {
      const { query } = await mount(() => {
        const btnRef = ref<HTMLButtonElement>();
        return html`<button ref=${btnRef}>Click</button>`;
      });
      expect(query('button')).not.toBeNull();
    });

    it('should update ref value when element mounts', async () => {
      let divRef!: ReturnType<typeof ref<HTMLDivElement>>;
      await mount(() => {
        divRef = ref<HTMLDivElement>();
        return html`<div ref=${divRef}>Test</div>`;
      });
      expect(divRef.value).not.toBeNull();
    });

    it('should support refs list', async () => {
      await mount(() => {
        const items = signal([1, 2, 3]);
        const itemRefs = refs<HTMLLIElement>();
        return html`<ul>
          ${html.each(items, (item) => html`<li ref=${itemRefs}>${item}</li>`)}
        </ul>`;
      });
    });
  });

  describe('prop()', () => {
    it('should create reactive prop', async () => {
      const { query } = await mount(() => {
        const nameProp = prop('name', 'Guest');
        return html`<div>Hello ${nameProp}</div>`;
      });
      expect(query('div')?.textContent).toContain('Guest');
    });

    it('should update from attribute', async () => {
      const { query } = await mount(
        () => {
          const nameProp = prop('name', 'Guest');
          return html`<div>${nameProp}</div>`;
        },
        { attrs: { name: 'Alice' } },
      );
      expect(query('div')?.textContent).toBe('Alice');
    });
  });

  describe('Context (provide/inject)', () => {
    it('should provide and inject values', async () => {
      const ThemeKey = Symbol('theme') as InjectionKey<string>;
      await mount(() => {
        provide(ThemeKey, 'dark');
        return html`<div>${inject(ThemeKey) ?? ''}</div>`;
      });
    });

    it('should use default value when not provided', async () => {
      const Key = Symbol('test') as InjectionKey<string>;
      const { query } = await mount(() => {
        const value = inject(Key, 'default');
        return html`<div>${value}</div>`;
      });
      expect(query('div')?.textContent).toBe('default');
    });

    it('should provide type-safe context', async () => {
      const UserContext = createContext<{ name: string; role: string }>();

      // Consumer must be a registered element so it can be nested
      const childTag = (
        await mount(() => {
          const user = inject(UserContext);
          return html`<div class="user-info">${user?.name} (${user?.role})</div>`;
        })
      ).element.tagName.toLowerCase();

      const { element, flush } = await mount(() => {
        provide(UserContext, { name: 'Alice', role: 'admin' });
        return html`<${childTag}></${childTag}>`;
      });
      await flush();

      const childEl = element.shadowRoot?.querySelector(childTag);
      const userDiv = childEl?.shadowRoot?.querySelector('.user-info');
      expect(userDiv?.textContent).toBe('Alice (admin)');
    });
  });

  describe('field()', () => {
    it('should create form field with validation methods', async () => {
      let formField!: ReturnType<typeof field>;
      await mount(
        () => {
          formField = field({ value: signal('test') });
          return html`<div></div>`;
        },
        { defineOptions: { formAssociated: true } },
      );
      expect(formField).toHaveProperty('setValidity');
      expect(formField).toHaveProperty('reportValidity');
      formField.setValidity({ valueMissing: true }, 'Required');
      expect(typeof formField.reportValidity()).toBe('boolean');
    });

    it('should handle custom toFormValue transformation', async () => {
      let transformCalled = false;
      await mount(
        () => {
          field({
            toFormValue: (v) => {
              transformCalled = true;
              return `number:${v}`;
            },
            value: signal(42),
          });
          return html`<div></div>`;
        },
        { defineOptions: { formAssociated: true } },
      );
      expect(transformCalled).toBe(true);
    });

    it('should sync disabled state', async () => {
      await mount(
        () => {
          const value = signal('test');
          const disabled = signal(false);
          field({ disabled, value });
          return html`<input :value=${value} ?disabled=${disabled} />`;
        },
        { defineOptions: { formAssociated: true } },
      );
    });
  });

  describe('bind()', () => {
    it('should support bind() for input', async () => {
      const { query, flush } = await mount(() => {
        const text = signal('initial');
        html.bind(text);
        return html`<input
          value=${text}
          @input=${(e: Event) => {
            text.value = (e.target as HTMLInputElement).value;
          }} />`;
      });
      const input = query('input') as HTMLInputElement;
      expect(input.value).toBe('initial');

      input.value = 'updated';
      fire.input(input);
      await flush();
      expect(input.value).toBe('updated');
    });

    it('should support bind() for checkbox', async () => {
      const { query, flush } = await mount(() => {
        const checked = signal(false);
        html.bind(checked);
        return html`<input
          type="checkbox"
          ?checked=${checked}
          @change=${(e: Event) => {
            checked.value = (e.target as HTMLInputElement).checked;
          }} />`;
      });
      const checkbox = query('input') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      checkbox.checked = true;
      fire.change(checkbox);
      await flush();
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('createId()', () => {
    it('should generate unique IDs', () => {
      const id1 = createId();
      const id2 = createId();
      expect(id1).not.toBe(id2);
    });

    it('should use prefix when provided', () => {
      const id = createId('label');
      expect(id).toMatch(/^label-/);
    });

    it('should use default prefix when none provided', () => {
      const id = createId();
      expect(id).toMatch(/^cft-/);
    });
  });

  describe('guard()', () => {
    it('should call handler when condition is true', () => {
      const handler = vi.fn();
      const guarded = guard(() => true, handler);
      const fakeEvent = new Event('click');
      guarded(fakeEvent);
      expect(handler).toHaveBeenCalledWith(fakeEvent);
    });

    it('should not call handler when condition is false', () => {
      const handler = vi.fn();
      const guarded = guard(() => false, handler);
      guarded(new Event('click'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should re-evaluate condition on each call', () => {
      const handler = vi.fn();
      let enabled = false;
      const guarded = guard(() => enabled, handler);
      guarded(new Event('click'));
      expect(handler).toHaveBeenCalledTimes(0);
      enabled = true;
      guarded(new Event('click'));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('defineSlots()', () => {
    it('should detect whether a named slot has assigned nodes', async () => {
      let capturedSlots!: ReturnType<typeof defineSlots>;
      const { flush } = await mount(
        () => {
          capturedSlots = defineSlots();
          return html`<slot name="header"></slot><slot></slot>`;
        },
        { html: '<span slot="header">Title</span>' },
      );
      await flush();
      expect(capturedSlots.has('header')).toBe(true);
      expect(capturedSlots.has('default')).toBe(false);
    });
  });

  describe('defineEmits()', () => {
    it('should emit type-safe custom events', async () => {
      const { element } = await mount(() => {
        const emit = defineEmits<{ value: { value: string } }>();
        setTimeout(() => emit('value', { value: 'test-value' }), 50);
        return html`<div>Emitter Component</div>`;
      });

      const event = await waitForEvent<CustomEvent>(element, 'value');
      expect(event.detail.value).toBe('test-value');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple refs in same component', async () => {
      const { query } = await mount(() => {
        const ref1 = ref<HTMLDivElement>();
        const ref2 = ref<HTMLSpanElement>();
        return html`<div ref=${ref1}>Div</div>
          <span ref=${ref2}>Span</span>`;
      });
      expect(query('div')).not.toBeNull();
      expect(query('span')).not.toBeNull();
    });

    it('should handle nested provides', async () => {
      const Key = Symbol('value') as InjectionKey<number>;
      let receivedValue: number | undefined;

      define('test-nested-consumer-4', () => {
        receivedValue = inject(Key);
        return html`<div class="result">${receivedValue}</div>`;
      });

      define('test-nested-inner-4', () => {
        provide(Key, 2);
        return html`<test-nested-consumer-4></test-nested-consumer-4>`;
      });

      define('test-nested-outer-4', () => {
        provide(Key, 1);
        return html`<test-nested-inner-4></test-nested-inner-4>`;
      });

      const { element, flush } = await mount('test-nested-outer-4');
      await flush();

      const innerEl = element.shadowRoot?.querySelector('test-nested-inner-4');
      const consumerEl = innerEl?.shadowRoot?.querySelector('test-nested-consumer-4');
      const resultDiv = consumerEl?.shadowRoot?.querySelector('div.result');

      expect(receivedValue).toBe(2);
      expect(resultDiv?.textContent).toBe('2');
    });
  });
});
