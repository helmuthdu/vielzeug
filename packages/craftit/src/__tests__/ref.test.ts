/**
 * Craftit - Ref System Tests
 * Tests for element references
 */

import { define, html, onMount } from '..';
import { bindRef, isRef, ref } from '../ref';

describe('Ref System', () => {
  describe('ref()', () => {
    it('should create a ref with null initial value', () => {
      const elementRef = ref();
      expect(elementRef.value).toBeNull();
    });

    it('should create typed ref', () => {
      const buttonRef = ref<HTMLButtonElement>();
      const inputRef = ref<HTMLInputElement>();
      const divRef = ref<HTMLDivElement>();

      expect(buttonRef.value).toBeNull();
      expect(inputRef.value).toBeNull();
      expect(divRef.value).toBeNull();
    });

    it('should be an object with value property', () => {
      const elementRef = ref();
      expect(elementRef).toBeTypeOf('object');
      expect(elementRef).toHaveProperty('value');
    });
  });

  describe('isRef()', () => {
    it('should return true for ref objects', () => {
      const elementRef = ref();
      expect(isRef(elementRef)).toBe(true);
    });

    it('should return false for non-ref objects', () => {
      expect(isRef(null)).toBe(false);
      expect(isRef(undefined)).toBe(false);
      expect(isRef({})).toBe(false);
      expect(isRef({ extra: 'prop', value: null })).toBe(false); // Has extra properties
      expect(isRef(42)).toBe(false);
      expect(isRef('string')).toBe(false);
      expect(isRef([])).toBe(false);
    });

    it('should return true only for ref-like objects', () => {
      const realRef = ref();
      const fakeRef = { extra: 'property', value: null };
      const exactMatch = { value: null };

      expect(isRef(realRef)).toBe(true);
      expect(isRef(fakeRef)).toBe(false); // Has extra property
      expect(isRef(exactMatch)).toBe(true); // Exact match should work
    });
  });

  describe('bindRef()', () => {
    it('should bind element to ref', () => {
      const elementRef = ref<HTMLDivElement>();
      const div = document.createElement('div');

      bindRef(elementRef, div);

      expect(elementRef.value).toBe(div);
    });

    it('should bind different element types', () => {
      const buttonRef = ref<HTMLButtonElement>();
      const inputRef = ref<HTMLInputElement>();

      const button = document.createElement('button');
      const input = document.createElement('input');

      bindRef(buttonRef, button);
      bindRef(inputRef, input);

      expect(buttonRef.value).toBe(button);
      expect(inputRef.value).toBe(input);
    });

    it('should overwrite previous binding', () => {
      const elementRef = ref<HTMLDivElement>();
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');

      bindRef(elementRef, div1);
      expect(elementRef.value).toBe(div1);

      bindRef(elementRef, div2);
      expect(elementRef.value).toBe(div2);
    });
  });

  describe('Integration with Components', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('should bind ref in template', async () => {
      let buttonRef: any;

      define('test-ref-bind', () => {
        buttonRef = ref<HTMLButtonElement>();
        return html`<button ref=${buttonRef}>Click</button>`;
      });

      const el = document.createElement('test-ref-bind');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(buttonRef.value).toBeInstanceOf(HTMLButtonElement);
      expect(buttonRef.value?.tagName).toBe('BUTTON');
      expect(buttonRef.value?.textContent).toBe('Click');
    });

    it('should bind multiple refs', async () => {
      let inputRef: any;
      let buttonRef: any;
      let divRef: any;

      define('test-multiple-refs', () => {
        inputRef = ref<HTMLInputElement>();
        buttonRef = ref<HTMLButtonElement>();
        divRef = ref<HTMLDivElement>();

        return html`
					<div ref=${divRef}>
						<input ref=${inputRef} type="text" />
						<button ref=${buttonRef}>Submit</button>
					</div>
				`;
      });

      const el = document.createElement('test-multiple-refs');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(inputRef.value).toBeInstanceOf(HTMLInputElement);
      expect(buttonRef.value).toBeInstanceOf(HTMLButtonElement);
      expect(divRef.value).toBeInstanceOf(HTMLDivElement);
    });

    it('should allow access in onMount', async () => {
      let capturedElement: HTMLDivElement | null = null;

      define('test-ref-mount', () => {
        const divRef = ref<HTMLDivElement>();

        onMount(() => {
          capturedElement = divRef.value;
        });

        return html`<div ref=${divRef} class="test">Content</div>`;
      });

      const el = document.createElement('test-ref-mount');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(capturedElement).toBeInstanceOf(HTMLDivElement);
      // After asserting it's an instance, we know it's not null
      expect(capturedElement!.className).toBe('test');
      expect(capturedElement!.textContent).toBe('Content');
    });

    it.skip('should work with focus management (JSDOM limitation)', async () => {
      let focused = false;

      define('test-ref-focus', () => {
        const inputRef = ref<HTMLInputElement>();

        onMount(() => {
          inputRef.value?.focus();
          focused = document.activeElement === inputRef.value;
        });

        return html`<input ref=${inputRef} type="text" />`;
      });

      const el = document.createElement('test-ref-focus');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(focused).toBe(true);
    });

    it('should work with value setting', async () => {
      define('test-ref-value', () => {
        const inputRef = ref<HTMLInputElement>();

        onMount(() => {
          if (inputRef.value) {
            inputRef.value.value = 'Initial value';
          }
        });

        return html`<input ref=${inputRef} type="text" />`;
      });

      const el = document.createElement('test-ref-value');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const input = el.shadowRoot?.querySelector('input');
      expect(input?.value).toBe('Initial value');
    });

    it('should work with DOM manipulation', async () => {
      define('test-ref-dom', () => {
        const divRef = ref<HTMLDivElement>();

        onMount(() => {
          if (divRef.value) {
            divRef.value.innerHTML = '<span>Added content</span>';
          }
        });

        return html`<div ref=${divRef}>Original</div>`;
      });

      const el = document.createElement('test-ref-dom');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.querySelector('span')).not.toBeNull();
      expect(div?.querySelector('span')?.textContent).toBe('Added content');
    });

    it('should handle refs in conditional rendering', async () => {
      let elementRef: any;

      define('test-ref-conditional', () => {
        elementRef = ref<HTMLDivElement>();
        const show = true;

        return html`
					${show ? html`<div ref=${elementRef}>Visible</div>` : ''}
				`;
      });

      const el = document.createElement('test-ref-conditional');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(elementRef.value).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null binding gracefully', () => {
      const elementRef = ref<HTMLElement>();
      // TypeScript would normally prevent this, but testing runtime behavior
      bindRef(elementRef, null as any);
      expect(elementRef.value).toBeNull();
    });

    it('should handle undefined binding gracefully', () => {
      const elementRef = ref<HTMLElement>();
      bindRef(elementRef, undefined as any);
      expect(elementRef.value).toBeUndefined();
    });

    it('should allow rebinding to same element', () => {
      const elementRef = ref<HTMLDivElement>();
      const div = document.createElement('div');

      bindRef(elementRef, div);
      bindRef(elementRef, div);
      bindRef(elementRef, div);

      expect(elementRef.value).toBe(div);
    });

    it('should work with custom elements', () => {
      const elementRef = ref<HTMLElement>();
      const custom = document.createElement('custom-element');

      bindRef(elementRef, custom);

      expect(elementRef.value).toBe(custom);
      expect(elementRef.value?.tagName).toBe('CUSTOM-ELEMENT');
    });

    it('should handle rapid rebinding', () => {
      const elementRef = ref<HTMLDivElement>();
      const elements = Array.from({ length: 100 }, () => document.createElement('div'));

      for (const element of elements) {
        bindRef(elementRef, element);
      }

      expect(elementRef.value).toBe(elements[elements.length - 1]);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety with generics', () => {
      const buttonRef = ref<HTMLButtonElement>();
      const inputRef = ref<HTMLInputElement>();
      const divRef = ref<HTMLDivElement>();

      // These should all be null initially
      expect(buttonRef.value).toBeNull();
      expect(inputRef.value).toBeNull();
      expect(divRef.value).toBeNull();

      // After binding, should have correct types
      bindRef(buttonRef, document.createElement('button'));
      bindRef(inputRef, document.createElement('input'));
      bindRef(divRef, document.createElement('div'));

      expect(buttonRef.value?.tagName).toBe('BUTTON');
      expect(inputRef.value?.tagName).toBe('INPUT');
      expect(divRef.value?.tagName).toBe('DIV');
    });

    it('should work with HTMLElement base type', () => {
      const elementRef = ref<HTMLElement>();

      const button = document.createElement('button');
      bindRef(elementRef, button);

      expect(elementRef.value).toBe(button);
    });

    it('should work with Element base type', () => {
      const elementRef = ref<Element>();

      const div = document.createElement('div');
      bindRef(elementRef, div);

      expect(elementRef.value).toBe(div);
    });
  });
});
