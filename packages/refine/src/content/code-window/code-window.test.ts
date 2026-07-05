import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-code-window', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./code-window');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the window chrome', async () => {
      fixture = await mount('ore-code-window');

      expect(fixture.query('.window')).toBeTruthy();
      expect(fixture.query('.header')).toBeTruthy();
      expect(fixture.query('.body')).toBeTruthy();
    });

    it('renders slotted body content', async () => {
      fixture = await mount('ore-code-window', { html: '<pre>const x = 1;</pre>' });

      expect(fixture.element.querySelector('pre')?.textContent).toBe('const x = 1;');
    });

    it('renders header-end slot content', async () => {
      fixture = await mount('ore-code-window', {
        html: '<button slot="header-end" id="copy">Copy</button>',
      });

      expect(fixture.element.querySelector('#copy')).toBeTruthy();
    });
  });

  // ─── Variant: code (default) ─────────────────────────────────────────────────

  describe('Variant: code (default)', () => {
    it('defaults to the code variant', async () => {
      fixture = await mount('ore-code-window');

      expect(fixture.element.getAttribute('variant')).toBe('code');
      expect(fixture.query('.lang')).toBeTruthy();
    });

    it('renders the lang badge with the given language', async () => {
      fixture = await mount('ore-code-window', { attrs: { lang: 'sh' } });

      expect(fixture.query('.lang')?.textContent?.trim()).toBe('sh');
    });

    it('defaults lang to "ts"', async () => {
      fixture = await mount('ore-code-window');

      expect(fixture.query('.lang')?.textContent?.trim()).toBe('ts');
    });

    it('does not render a filename label when filename is unset', async () => {
      fixture = await mount('ore-code-window');

      expect(fixture.query('.filename')).toBeFalsy();
    });

    it('renders the filename label when filename is set', async () => {
      fixture = await mount('ore-code-window', { attrs: { filename: 'app.ts' } });

      expect(fixture.query('.filename')?.textContent?.trim()).toBe('app.ts');
    });

    it('does not render traffic-light dots or a title in code variant', async () => {
      fixture = await mount('ore-code-window', { attrs: { title: 'Ignored in code variant' } });

      expect(fixture.query('.dots')).toBeFalsy();
      expect(fixture.query('.title')).toBeFalsy();
    });
  });

  // ─── Variant: chat ────────────────────────────────────────────────────────────

  describe('Variant: chat', () => {
    it('renders traffic-light dots and a title', async () => {
      fixture = await mount('ore-code-window', { attrs: { title: 'MCP tool call', variant: 'chat' } });

      expect(fixture.query('.dots')).toBeTruthy();
      expect(fixture.query('.title')?.textContent?.trim()).toBe('MCP tool call');
    });

    it('defaults title to "MCP tool call"', async () => {
      fixture = await mount('ore-code-window', { attrs: { variant: 'chat' } });

      expect(fixture.query('.title')?.textContent?.trim()).toBe('MCP tool call');
    });

    it('the traffic-light dots container is aria-hidden', async () => {
      fixture = await mount('ore-code-window', { attrs: { variant: 'chat' } });

      expect(fixture.query('.dots')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders exactly three dot spans', async () => {
      fixture = await mount('ore-code-window', { attrs: { variant: 'chat' } });

      expect(fixture.shadow?.querySelectorAll('.dots > span').length).toBe(3);
    });

    it('does not render the lang badge or filename in chat variant', async () => {
      fixture = await mount('ore-code-window', { attrs: { filename: 'app.ts', variant: 'chat' } });

      expect(fixture.query('.lang')).toBeFalsy();
      expect(fixture.query('.filename')).toBeFalsy();
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('falls back to the code variant for an invalid variant value', async () => {
      fixture = await mount('ore-code-window', { attrs: { variant: 'invalid' } });

      expect(fixture.query('.lang')).toBeTruthy();
      expect(fixture.query('.dots')).toBeFalsy();
    });

    it('switches variant reactively', async () => {
      fixture = await mount('ore-code-window', { attrs: { variant: 'code' } });

      expect(fixture.query('.lang')).toBeTruthy();

      fixture.element.setAttribute('variant', 'chat');
      await fixture.flush();

      expect(fixture.query('.lang')).toBeFalsy();
      expect(fixture.query('.dots')).toBeTruthy();
    });
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('ore-code-window accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./code-window');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  it('passes axe checks (code variant)', async () => {
    fixture = await mount('ore-code-window', {
      attrs: { filename: 'app.ts', lang: 'ts' },
      html: '<pre>const x = 1;</pre>',
    });

    const results = await axeCheck(fixture.element);

    expect(results.violations).toHaveLength(0);
  });

  it('passes axe checks (chat variant)', async () => {
    fixture = await mount('ore-code-window', {
      attrs: { title: 'MCP tool call', variant: 'chat' },
      html: '<p>Conversation turn</p>',
    });

    const results = await axeCheck(fixture.element);

    expect(results.violations).toHaveLength(0);
  });
});
