import { signal } from '@vielzeug/ripple';

import { define, html, onCleanup, prop } from '../index';
import { mount } from '../testing';
import { uniqueTag } from './test-utils';

describe('component definition and rendering', () => {
  describe('define()', () => {
    it('defines a custom element', () => {
      const tag = uniqueTag('test-basic');

      define(tag, {
        setup: () => html`
          <div>Hello</div>
        `,
      });

      expect(document.createElement(tag)).toBeInstanceOf(HTMLElement);
    });

    it('renders template content into shadow root', async () => {
      const { query } = await mount(
        () => html`
          <div class="content">Content</div>
        `,
      );

      expect(query('.content')?.textContent).toBe('Content');
    });

    it('rejects duplicate tag registration', () => {
      const tag = uniqueTag('test-dup');

      define(tag, {
        setup: () => html`
          <div>First</div>
        `,
      });

      expect(() => {
        define(tag, {
          setup: () => html`
            <div>Second</div>
          `,
        });
      }).toThrow(`define('${tag}') called twice`);
    });

    it('duplicate registration error includes diagnostic guidance', () => {
      const tag = uniqueTag('test-dup-msg');

      define(tag, {
        setup: () => html`
          <div>First</div>
        `,
      });

      let caught: unknown;

      try {
        define(tag, {
          setup: () => html`
            <div>Second</div>
          `,
        });
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(Error);

      const msg = (caught as Error).message;

      expect(msg).toContain('called twice');
      expect(msg).toContain('already registered');
    });
  });

  describe('render lifecycle', () => {
    it('supports reactive templates', async () => {
      let count!: ReturnType<typeof signal<number>>;
      const { act, query } = await mount(() => {
        count = signal(0);

        return html`
          <div>${count}</div>
        `;
      });

      expect(query('div')?.textContent).toBe('0');

      await act(() => {
        count.value += 1;
      });

      expect(query('div')?.textContent).toBe('1');
    });

    it('keeps component state isolated between instances', async () => {
      const setup = () => {
        const count = signal(0);

        return html`
          <div>${count}</div>
        `;
      };

      const { query: query1 } = await mount(setup);
      const { query: query2 } = await mount(setup);

      expect(query1('div')?.textContent).toBe('0');
      expect(query2('div')?.textContent).toBe('0');
    });

    it('rebuilds setup state correctly after reconnect', async () => {
      let setupRuns = 0;

      const fixture = await mount(
        (props) => {
          const setupRun = ++setupRuns;

          return html`
            <div class="count">${() => `${setupRun}:${props.count.value}`}</div>
          `;
        },
        { componentOptions: { props: { count: prop.number(0) } } },
      );

      await fixture.attr('count', '1');
      expect(fixture.query('.count')?.textContent).toBe('1:1');

      fixture.element.remove();
      await fixture.flush();
      document.body.appendChild(fixture.element);
      await fixture.flush();

      expect(setupRuns).toBe(2);

      await fixture.attr('count', '2');
      expect(fixture.query('.count')?.textContent).toBe('2:2');
    });

    it('disposes partial setup state when setup throws before a later retry', () => {
      const cleanup = vi.fn();
      const tag = uniqueTag('setup-retry');
      let shouldThrow = true;

      define(tag, {
        setup: () => {
          onCleanup(cleanup);

          if (shouldThrow) throw new Error('setup failed');

          return html`
            <p>Recovered</p>
          `;
        },
      });

      const element = document.createElement(tag) as HTMLElement & {
        connectedCallback(): void;
        disconnectedCallback(): void;
      };

      expect(() => element.connectedCallback()).toThrow('setup failed');
      expect(cleanup).toHaveBeenCalledOnce();

      shouldThrow = false;
      element.connectedCallback();

      expect(element.shadowRoot?.textContent).toContain('Recovered');

      element.disconnectedCallback();
      expect(cleanup).toHaveBeenCalledTimes(2);
    });
  });

  describe('shadow dom and template boundaries', () => {
    it('creates a shadow root', async () => {
      const { shadow } = await mount(
        () => html`
          <div>Shadow Content</div>
        `,
      );

      expect(shadow?.querySelector('div')?.textContent).toBe('Shadow Content');
    });

    it('handles empty html results', async () => {
      const { shadow } = await mount(() => html``);

      expect(shadow).not.toBeNull();
    });
  });
});
