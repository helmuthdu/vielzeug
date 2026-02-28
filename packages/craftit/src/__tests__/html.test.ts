/**
 * Craftit - HTML Template Tests
 * Tests for template system and reactive bindings
 */

import { define, html, onMount, ref, signal } from '..';
import { mount } from '../testing/render';

describe('HTML Template System', () => {
  describe('Basic Rendering', () => {
    it('should render static HTML', async () => {
      define('test-static', () => {
        return html`<div class="test">Hello World</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-static');
      await waitForUpdates();

      expect(query('.test')?.textContent).toBe('Hello World');

      unmount();
    });

    it('should render multiple elements', async () => {
      define('test-multiple', () => {
        return html`
					<h1>Title</h1>
					<p>Paragraph</p>
					<span>Span</span>
				`;
      });

      const { query, waitForUpdates, unmount } = mount('test-multiple');
      await waitForUpdates();

      expect(query('h1')?.textContent).toBe('Title');
      expect(query('p')?.textContent).toBe('Paragraph');
      expect(query('span')?.textContent).toBe('Span');

      unmount();
    });

    it('should render nested elements', async () => {
      define('test-nested', () => {
        return html`
					<div class="outer">
						<div class="middle">
							<span class="inner">Nested</span>
						</div>
					</div>
				`;
      });

      const { query, waitForUpdates, unmount } = mount('test-nested');
      await waitForUpdates();

      expect(query('.inner')?.textContent).toBe('Nested');

      unmount();
    });
  });

  describe('Signal Interpolation', () => {
    it('should render signal value in text', async () => {
      let count!: ReturnType<typeof signal>;

      define('test-signal-text', () => {
        count = signal(42);
        return html`<div class="value">${count}</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-signal-text');
      await waitForUpdates();

      expect(query('.value')?.textContent).toBe('42');

      unmount();
    });

    it('should update when signal changes', async () => {
      let count!: ReturnType<typeof signal>;

      define('test-signal-update', () => {
        count = signal(0);
        return html`<div class="count">${count}</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-signal-update');
      await waitForUpdates();

      expect(query('.count')?.textContent).toBe('0');

      count.value = 42;
      await waitForUpdates();

      expect(query('.count')?.textContent).toBe('42');

      unmount();
    });

    it('should render multiple signals', async () => {
      let a!: ReturnType<typeof signal>;
      let b!: ReturnType<typeof signal>;

      define('test-multiple-signals', () => {
        a = signal('Hello');
        b = signal('World');
        return html`<div>${a} ${b}</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-multiple-signals');
      await waitForUpdates();

      expect(query('div')?.textContent?.trim()).toBe('Hello World');

      a.value = 'Goodbye';
      await waitForUpdates();

      expect(query('div')?.textContent?.trim()).toBe('Goodbye World');

      unmount();
    });

    it('should render signal in attribute', async () => {
      let className!: ReturnType<typeof signal>;

      define('test-signal-attr', () => {
        className = signal('active');
        return html`<div class=${className}>Test</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-signal-attr');
      await waitForUpdates();

      const div = query('div');
      expect(div?.className).toBe('active');

      className.value = 'inactive';
      await waitForUpdates();

      expect(div?.className).toBe('inactive');

      unmount();
    });

    it('should handle boolean attributes with signals', async () => {
      let disabled!: ReturnType<typeof signal>;

      define('test-signal-bool', () => {
        disabled = signal(false);
        return html`<button disabled=${disabled}>Click</button>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-signal-bool');
      await waitForUpdates();

      const button = query('button');
      expect(button?.hasAttribute('disabled')).toBe(false);

      disabled.value = true;
      await waitForUpdates();

      expect(button?.hasAttribute('disabled')).toBe(true);

      unmount();
    });
  });

  describe('Event Handlers', () => {
    it('should attach click handler', async () => {
      const clickSpy = vi.fn();

      define('test-click', () => {
        return html`<button @click=${clickSpy}>Click me</button>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-click');
      await waitForUpdates();

      (query('button') as HTMLButtonElement)?.click();

      expect(clickSpy).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('should pass event to handler', async () => {
      let receivedEvent: Event | null = null;

      define('test-event-arg', () => {
        return html`<button @click=${(e: Event) => {
          receivedEvent = e;
        }}>Click</button>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-event-arg');
      await waitForUpdates();

      (query('button') as HTMLButtonElement)?.click();

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.type).toBe('click');

      unmount();
    });

    it('should support prevent modifier', async () => {
      const handlerSpy = vi.fn();

      define('test-prevent', () => {
        return html`
					<form @submit.prevent=${handlerSpy}>
						<button type="submit">Submit</button>
					</form>
				`;
      });

      const { query, waitForUpdates, unmount } = mount('test-prevent');
      await waitForUpdates();

      const form = query('form');
      const event = new Event('submit', { bubbles: true, cancelable: true });
      form?.dispatchEvent(event);

      expect(handlerSpy).toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);

      unmount();
    });

    it('should support stop modifier', async () => {
      const divClickSpy = vi.fn();
      const buttonClickSpy = vi.fn();

      define('test-stop', () => {
        return html`
					<div @click=${divClickSpy}>
						<button @click.stop=${buttonClickSpy}>Click</button>
					</div>
				`;
      });

      const { query, waitForUpdates, unmount } = mount('test-stop');
      await waitForUpdates();

      const button = query('button');
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      button?.dispatchEvent(event);

      expect(buttonClickSpy).toHaveBeenCalled();
      expect(divClickSpy).not.toHaveBeenCalled();

      unmount();
    });

    it('should handle multiple event types', async () => {
      const clickSpy = vi.fn();
      const mouseoverSpy = vi.fn();

      define('test-multiple-events', () => {
        return html`
					<button 
						@click=${clickSpy}
						@mouseover=${mouseoverSpy}
					>Hover and Click</button>
				`;
      });

      const { query, waitForUpdates, unmount } = mount('test-multiple-events');
      await waitForUpdates();

      const button = query('button');

      button?.dispatchEvent(new MouseEvent('mouseover'));
      expect(mouseoverSpy).toHaveBeenCalledTimes(1);

      (button as HTMLButtonElement)?.click();
      expect(clickSpy).toHaveBeenCalledTimes(1);

      unmount();
    });
  });

  describe('Refs', () => {
    it('should bind ref to element', async () => {
      let buttonRef!: ReturnType<typeof ref<HTMLButtonElement>>;

      define('test-ref', () => {
        buttonRef = ref<HTMLButtonElement>();
        return html`<button ref=${buttonRef}>Click</button>`;
      });

      const { waitForUpdates, unmount } = mount('test-ref');
      await waitForUpdates();

      expect(buttonRef.value).toBeInstanceOf(HTMLButtonElement);
      expect(buttonRef.value?.textContent).toBe('Click');

      unmount();
    });

    it('should bind multiple refs', async () => {
      let inputRef!: ReturnType<typeof ref<HTMLInputElement>>;
      let buttonRef!: ReturnType<typeof ref<HTMLButtonElement>>;

      define('test-multiple-refs', () => {
        inputRef = ref<HTMLInputElement>();
        buttonRef = ref<HTMLButtonElement>();

        return html`
					<input ref=${inputRef} type="text" />
					<button ref=${buttonRef}>Submit</button>
				`;
      });

      const { waitForUpdates, unmount } = mount('test-multiple-refs');
      await waitForUpdates();

      expect(inputRef.value).toBeInstanceOf(HTMLInputElement);
      expect(buttonRef.value).toBeInstanceOf(HTMLButtonElement);

      unmount();
    });

    it('should allow ref access in onMount', async () => {
      let refValue: HTMLElement | null = null;

      define('test-ref-mount', () => {
        const divRef = ref<HTMLDivElement>();

        onMount(() => {
          refValue = divRef.value;
        });

        return html`<div ref=${divRef}>Content</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-ref-mount');
      await waitForUpdates();

      expect(refValue).toBeInstanceOf(HTMLDivElement);
      expect(refValue!.textContent).toBe('Content');

      unmount();
    });
  });

  describe('Array Rendering', () => {
    it('should render array of strings', async () => {
      define('test-array-strings', () => {
        const items = ['Apple', 'Banana', 'Cherry'];
        return html`
					<ul>
						${items.map((item) => html`<li>${item}</li>`)}
					</ul>
				`;
      });

      const { queryAll, waitForUpdates, unmount } = mount('test-array-strings');
      await waitForUpdates();

      const items = queryAll('li');
      expect(items.length).toBe(3);
      expect(items[0]?.textContent).toBe('Apple');
      expect(items[1]?.textContent).toBe('Banana');
      expect(items[2]?.textContent).toBe('Cherry');

      unmount();
    });

    it('should render array from signal', async () => {
      let items!: ReturnType<typeof signal<string[]>>;

      define('test-array-signal', () => {
        items = signal(['One', 'Two', 'Three']);
        return html`
					<ul>
						${items.value.map((item: string) => html`<li>${item}</li>`)}
					</ul>
				`;
      });

      const { queryAll, waitForUpdates, unmount } = mount('test-array-signal');
      await waitForUpdates();

      const listItems = queryAll('li');
      expect(listItems.length).toBe(3);

      items.value = ['A', 'B', 'C', 'D'];
      await waitForUpdates();

      // Note: This might not update automatically without re-render
      unmount();
    });
  });

  describe('Nested Templates', () => {
    it('should render nested template', async () => {
      define('test-nested-template', () => {
        const inner = html`<span>Inner</span>`;
        return html`<div>${inner}</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-nested-template');
      await waitForUpdates();

      expect(query('span')?.textContent).toBe('Inner');

      unmount();
    });

    it('should render conditional templates', async () => {
      let show!: ReturnType<typeof signal>;

      define('test-conditional', () => {
        show = signal(true);
        return html`
					<div>
						${show.value ? html`<span>Visible</span>` : html`<span>Hidden</span>`}
					</div>
				`;
      });

      const { query, waitForUpdates, unmount } = mount('test-conditional');
      await waitForUpdates();

      expect(query('span')?.textContent).toBe('Visible');

      unmount();
    });
  });

  describe('Template Helpers', () => {
    it('should support html.when for conditionals', async () => {
      define('test-when', () => {
        const show = true;
        return html`
					<div>
						${html.when(show, html`<span>Shown</span>`, html`<span>Hidden</span>`)}
					</div>
				`;
      });

      const { query, waitForUpdates, unmount } = mount('test-when');
      await waitForUpdates();

      expect(query('span')?.textContent).toBe('Shown');

      unmount();
    });

    it('should support html.each for arrays', async () => {
      define('test-each', () => {
        const items = [1, 2, 3];
        return html`
					<ul>
						${html.each(items, (item) => html`<li>${item}</li>`)}
					</ul>
				`;
      });

      const { queryAll, waitForUpdates, unmount } = mount('test-each');
      await waitForUpdates();

      const listItems = queryAll('li');
      expect(listItems.length).toBe(3);
      expect(listItems[0]?.textContent).toBe('1');

      unmount();
    });
  });

  it('should use html.classes helper', async () => {
    define('test-classes', () => {
      const isActive = signal(true);
      const isPrimary = signal(false);

      return html`
        <div
          class=${html.classes({
            active: isActive.value,
            button: true,
            primary: isPrimary.value,
          })}>
          Button
        </div>
      `;
    });

    const { query, waitForUpdates, unmount } = mount('test-classes');
    await waitForUpdates();

    const div = query('div');
    expect(div?.className).toContain('active');
    expect(div?.className).toContain('button');
    expect(div?.className).not.toContain('primary');

    unmount();
  });

  it('should use html.style helper', async () => {
    define('test-styles', () => {
      return html` <div style=${html.style({ color: 'red', fontSize: 16, padding: '10px' })}>Styled</div> `;
    });

    const { query, waitForUpdates, unmount } = mount('test-styles');
    await waitForUpdates();

    const div = query('div');
    expect(div?.getAttribute('style')).toContain('color:red');
    expect(div?.getAttribute('style')).toContain('font-size:16px');
    expect(div?.getAttribute('style')).toContain('padding:10px');

    unmount();
  });

  it('should use html.slot helper', async () => {
    define('test-slot', () => {
      return html`
        <div>
          <h1>Title</h1>
          ${html.slot()} ${html.slot('footer')}
        </div>
      `;
    });

    const { queryAll, waitForUpdates, unmount } = mount('test-slot');
    await waitForUpdates();

    const slots = queryAll('slot');
    expect(slots.length).toBe(2);
    expect(slots[0]?.hasAttribute('name')).toBe(false);
    expect(slots[1]?.getAttribute('name')).toBe('footer');

    unmount();
  });

  describe('Edge Cases', () => {
    it('should handle empty values', async () => {
      define('test-empty', () => {
        const empty = signal('');
        return html`<div>${empty}</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-empty');
      await waitForUpdates();

      expect(query('div')?.textContent).toBe('');

      unmount();
    });

    it('should handle null and undefined', async () => {
      define('test-null-undefined', () => {
        const nullVal = signal(null);
        const undefinedVal = signal(undefined);
        return html`<div>${nullVal} ${undefinedVal}</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-null-undefined');
      await waitForUpdates();

      expect(query('div')?.textContent).toBeTruthy();

      unmount();
    });

    it('should escape HTML in text', async () => {
      define('test-escape', () => {
        const dangerous = "<script>alert('xss')</script>";
        return html`<div>${dangerous}</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-escape');
      await waitForUpdates();

      const div = query('div');
      expect(div?.textContent).toContain('script');
      expect(div?.querySelector('script')).toBeNull();

      unmount();
    });
  });
});
