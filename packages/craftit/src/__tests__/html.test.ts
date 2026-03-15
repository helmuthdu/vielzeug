/**
 * Template - HTML Engine Tests
 * Tests for the core HTML template system, attribute binding, event handling, and lifecycle
 */

import { computed, define, escapeHtml, html, onError, onMount, signal } from '..';
import { fire, mount } from '../test';

describe('Template: HTML System', () => {
  describe('html Tagged Template', () => {
    it('should render static content', async () => {
      define('test-static', () => {
        return html`<div>Hello World</div>`;
      });

      const { query } = await mount('test-static');

      expect(query('div')?.textContent).toBe('Hello World');
    });

    it('should interpolate values', async () => {
      define('test-interpolate', () => {
        const name = 'Alice';

        return html`<div>Hello ${name}</div>`;
      });

      const { query } = await mount('test-interpolate');

      expect(query('div')?.textContent).toBe('Hello Alice');
    });

    it('should support signal interpolation', async () => {
      define('test-signal-interpolate', () => {
        const count = signal(0);

        return html`<div>${count}</div>`;
      });

      const { query } = await mount('test-signal-interpolate');

      expect(query('div')?.textContent).toBe('0');
    });

    it('should support computed values', async () => {
      define('test-computed', () => {
        const count = signal(5);
        const doubled = computed(() => count.value * 2);

        return html`<div>${doubled}</div>`;
      });

      const { query } = await mount('test-computed');

      expect(query('div')?.textContent).toBe('10');
    });

    it('should escape HTML by default', async () => {
      define('test-escape', () => {
        const userInput = '<script>alert("xss")</script>';

        return html`<div>${userInput}</div>`;
      });

      const { query } = await mount('test-escape');

      expect(query('div')?.textContent).toBe('<script>alert("xss")</script>');
      expect(query('div')?.innerHTML).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('should preserve HTMLResult objects without escaping', async () => {
      define('test-html-result', () => {
        const inner = html`<span>Inner</span>`;

        return html`<div>${inner}</div>`;
      });

      const { query } = await mount('test-html-result');

      expect(query('span')?.textContent).toBe('Inner');
    });
  });

  describe('Attributes', () => {
    it('should set string attributes', async () => {
      define('test-attr-string', () => {
        const id = 'my-id';

        return html`<div id=${id}>Test</div>`;
      });

      const { query } = await mount('test-attr-string');

      expect(query('div')?.getAttribute('id')).toBe('my-id');
    });

    it('should set boolean attributes', async () => {
      define('test-attr-boolean', () => {
        const disabled = signal(true);

        return html`<button disabled=${disabled}>Click</button>`;
      });

      const { query } = await mount('test-attr-boolean');

      expect(query('button')?.hasAttribute('disabled')).toBe(true);
    });

    it('should remove false boolean attributes', async () => {
      define('test-attr-remove', () => {
        const disabled = signal(false);

        return html`<button disabled=${disabled}>Click</button>`;
      });

      const { query } = await mount('test-attr-remove');

      expect(query('button')?.hasAttribute('disabled')).toBe(false);
    });

    it('should support reactive attributes', async () => {
      define('test-reactive-attr', () => {
        const cls = signal('initial');

        setTimeout(() => (cls.value = 'updated'), 50);

        return html`<div class=${cls}>Test</div>`;
      });

      const { flush, query } = await mount('test-reactive-attr');

      expect(query('div')?.className).toBe('initial');

      await new Promise((r) => setTimeout(r, 60));
      await flush();
      expect(query('div')?.className).toBe('updated');
    });
  });

  describe('Event Handlers', () => {
    it('should bind click events', async () => {
      let clicked = false;

      define('test-click', () => {
        return html`<button @click=${() => (clicked = true)}>Click</button>`;
      });

      const { query } = await mount('test-click');

      fire.click(query('button')!);
      expect(clicked).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      define('test-null', () => {
        const value = null;

        return html`<div>${value}</div>`;
      });

      const { query } = await mount('test-null');

      expect(query('div')?.textContent).toBe('');
    });

    it('should handle undefined values', async () => {
      define('test-undefined', () => {
        const value = undefined;

        return html`<div>${value}</div>`;
      });

      const { query } = await mount('test-undefined');

      expect(query('div')?.textContent).toBe('');
    });

    it('should handle nested templates', async () => {
      define('test-nested', () => {
        const inner = html`<span>Inner</span>`;

        return html`<div>${inner}</div>`;
      });

      const { query } = await mount('test-nested');

      expect(query('span')?.textContent).toBe('Inner');
    });
  });

  describe('Utility: escapeHtml()', () => {
    it('should escape & < > characters', () => {
      expect(escapeHtml('<b>Bold</b>')).toBe('&lt;b&gt;Bold&lt;/b&gt;');
    });

    it('should escape double quotes', () => {
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('should convert non-string values via String()', () => {
      expect(escapeHtml(42)).toBe('42');
      expect(escapeHtml(null)).toBe('null');
    });

    it('should return an empty string unchanged', () => {
      expect(escapeHtml('')).toBe('');
    });
  });
});

describe('Lifecycle: onError()', () => {
  it('should call the error handler when setup throws', async () => {
    const errors: unknown[] = [];

    await mount(() => {
      onError((err) => errors.push(err));
      throw new Error('setup error');
    });

    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('setup error');
  });

  it('should call the error handler when onMount throws', async () => {
    const errors: unknown[] = [];
    const { destroy } = await mount(() => {
      onError((err) => errors.push(err));

      onMount(() => {
        throw new Error('mount error');
      });

      return html`<div></div>`;
    });

    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('mount error');

    destroy();
  });

  it('should not throw to the caller when a handler is registered', async () => {
    await expect(
      mount(() => {
        onError(() => {});
        throw new Error('swallowed');
      }),
    ).resolves.not.toThrow();
  });
});
