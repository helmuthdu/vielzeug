import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-prose', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./prose');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  const shadow = (el: HTMLElement): ShadowRoot => el.shadowRoot as ShadowRoot;

  describe('Rendering', () => {
    it('renders markdown into the shadow content container', async () => {
      fixture = await mount('ore-prose', { attrs: { markdown: '# Title\n\nHello **world**' } });

      const root = shadow(fixture.element);
      expect(root.querySelector('h1')?.textContent).toBe('Title');
      expect(root.querySelector('strong')?.textContent).toBe('world');
    });

    it('renders an empty container without a markdown value', async () => {
      fixture = await mount('ore-prose');

      expect(shadow(fixture.element).querySelector('.prose')?.childNodes).toHaveLength(0);
    });

    it('re-renders when the markdown attribute changes', async () => {
      fixture = await mount('ore-prose', { attrs: { markdown: 'first' } });
      fixture.element.setAttribute('markdown', '## second');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(shadow(fixture.element).querySelector('h2')?.textContent).toBe('second');
    });

    it('emits heading ids only with heading-ids', async () => {
      fixture = await mount('ore-prose', { attrs: { 'heading-ids': '', markdown: '# Setup' } });

      expect(shadow(fixture.element).querySelector('h1')?.getAttribute('id')).toBe('setup');
    });
  });

  describe('Safety', () => {
    it('renders raw HTML as literal characters', async () => {
      fixture = await mount('ore-prose', { attrs: { markdown: '<img src=x onerror=alert(1)>' } });

      const root = shadow(fixture.element);
      expect(root.querySelector('img')).toBeNull();
      expect(root.textContent).toContain('onerror=alert(1)');
    });

    it('degrades disallowed link protocols to label text', async () => {
      fixture = await mount('ore-prose', { attrs: { markdown: '[click](javascript:alert(1))' } });

      const root = shadow(fixture.element);
      expect(root.querySelector('a')).toBeNull();
      expect(root.querySelector('p')?.textContent).toBe('click');
    });
  });

  describe('Error handling', () => {
    it('falls back to plain text and emits error for oversized source', async () => {
      fixture = await mount('ore-prose');
      const events: CustomEvent[] = [];
      fixture.element.addEventListener('error', (event) => events.push(event as CustomEvent));

      fixture.element.setAttribute('markdown', 'x'.repeat(200_001));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(events).toHaveLength(1);
      expect(shadow(fixture.element).textContent).toContain('xxxx');
    });
  });

  describe('Accessibility', () => {
    it('has no axe violations with rich content', async () => {
      fixture = await mount('ore-prose', {
        attrs: {
          markdown:
            '# Guide\n\nIntro **text** with [a link](https://example.com).\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n> quoted',
        },
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toEqual([]);
    });
  });
});
