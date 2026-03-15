import { type Fixture, mount } from '@vielzeug/craftit/test';

// Light DOM fixtures use the proxy API:
//   bit-tr[head]  → mirrored into <thead> as native <tr>
//   bit-tr        → mirrored into <tbody> as native <tr>
//   bit-tr[foot]  → mirrored into <tfoot> as native <tr>
//   bit-th / bit-td → mirrored as native <th> / <td> with forwarded attrs
const HEAD_ROW = '<bit-tr head><bit-th scope="col">Name</bit-th><bit-th scope="col">Email</bit-th></bit-tr>';
const BODY_ROWS =
  '<bit-tr><bit-td>Alice</bit-td><bit-td>alice@example.com</bit-td></bit-tr><bit-tr><bit-td>Bob</bit-td><bit-td>bob@example.com</bit-td></bit-tr>';
const FOOT_ROW = '<bit-tr foot><bit-td colspan="2">2 users</bit-td></bit-tr>';
const ALL_ROWS = HEAD_ROW + BODY_ROWS + FOOT_ROW;

describe('bit-table', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./table');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the component element', async () => {
      fixture = await mount('bit-table');

      expect(fixture.element).toBeTruthy();
    });

    it('renders a scroll-container in shadow DOM', async () => {
      fixture = await mount('bit-table');

      expect(fixture.query('.scroll-container')).toBeTruthy();
    });

    it('renders a native table element built via DOM APIs', async () => {
      fixture = await mount('bit-table');

      expect(fixture.query('table')).toBeTruthy();
    });

    it('renders thead/tbody/tfoot built via DOM APIs (no parser foster-parenting)', async () => {
      fixture = await mount('bit-table');

      expect(fixture.query('thead')).toBeTruthy();
      expect(fixture.query('tbody')).toBeTruthy();
      expect(fixture.query('tfoot')).toBeTruthy();
    });

    it('mirrors head rows into native thead', async () => {
      fixture = await mount('bit-table', { html: HEAD_ROW });

      expect(fixture.query('thead tr')).toBeTruthy();
    });

    it('mirrors body rows into native tbody', async () => {
      fixture = await mount('bit-table', { html: BODY_ROWS });

      expect(fixture.query('tbody tr')).toBeTruthy();
    });

    it('mirrors foot rows into native tfoot', async () => {
      fixture = await mount('bit-table', { html: ALL_ROWS });

      expect(fixture.query('tfoot tr')).toBeTruthy();
    });

    it('renders a native caption element built via DOM APIs', async () => {
      fixture = await mount('bit-table');

      expect(fixture.query('caption')).toBeTruthy();
    });

    it('hides caption element when caption attr is absent', async () => {
      fixture = await mount('bit-table');

      expect((fixture.query('caption') as HTMLElement | null)?.hidden).toBe(true);
    });

    it('shows caption element when caption attr is provided', async () => {
      fixture = await mount('bit-table', { attrs: { caption: 'Users' } });

      expect((fixture.query('caption') as HTMLElement | null)?.hidden).toBe(false);
    });

    it('accepts head rows via bit-tr[head]', async () => {
      fixture = await mount('bit-table', { html: HEAD_ROW });

      expect(fixture.element.querySelector('bit-tr[head]')).toBeTruthy();
    });

    it('accepts body rows via plain bit-tr', async () => {
      fixture = await mount('bit-table', { html: BODY_ROWS });

      expect(fixture.element.querySelector('bit-tr:not([head]):not([foot])')).toBeTruthy();
    });

    it('accepts foot rows via bit-tr[foot]', async () => {
      fixture = await mount('bit-table', { html: ALL_ROWS });

      expect(fixture.element.querySelector('bit-tr[foot]')).toBeTruthy();
    });

    it('forwards colspan from bit-td to native td', async () => {
      fixture = await mount('bit-table', { html: FOOT_ROW });

      expect(fixture.query<HTMLTableCellElement>('tfoot td')?.colSpan).toBe(2);
    });

    it('forwards scope from bit-th to native th', async () => {
      fixture = await mount('bit-table', { html: HEAD_ROW });

      expect(fixture.query<HTMLTableCellElement>('thead th')?.getAttribute('scope')).toBe('col');
    });

    it('mirrors cell text content into native cells', async () => {
      fixture = await mount('bit-table', { html: BODY_ROWS });

      expect(fixture.query('tbody td')?.textContent).toBe('Alice');
    });
  });

  // ─── Props & Attributes ──────────────────────────────────────────────────────────

  describe('Props', () => {
    it('reflects caption attribute on host', async () => {
      fixture = await mount('bit-table', { attrs: { caption: 'My Table' } });

      expect(fixture.element.getAttribute('caption')).toBe('My Table');
    });

    it('reflects color attribute on host', async () => {
      fixture = await mount('bit-table', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('reflects striped boolean attribute on host', async () => {
      fixture = await mount('bit-table', { attrs: { striped: '' } });

      expect(fixture.element.hasAttribute('striped')).toBe(true);
    });

    it('reflects bordered boolean attribute on host', async () => {
      fixture = await mount('bit-table', { attrs: { bordered: '' } });

      expect(fixture.element.hasAttribute('bordered')).toBe(true);
    });

    it('reflects loading boolean attribute on host', async () => {
      fixture = await mount('bit-table', { attrs: { loading: '' } });

      expect(fixture.element.hasAttribute('loading')).toBe(true);
    });

    it('reflects sticky boolean attribute on host', async () => {
      fixture = await mount('bit-table', { attrs: { sticky: '' } });

      expect(fixture.element.hasAttribute('sticky')).toBe(true);
    });

    it('reflects size attribute on host', async () => {
      fixture = await mount('bit-table', { attrs: { size: 'sm' } });

      expect(fixture.element.getAttribute('size')).toBe('sm');
    });
  });

  // ─── Accessibility ───────────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('sets aria-busy=false on host when loading is absent', async () => {
      fixture = await mount('bit-table');

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
    });

    it('sets aria-busy=true on host when loading is set', async () => {
      fixture = await mount('bit-table', { attrs: { loading: '' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('updates aria-busy reactively when loading changes', async () => {
      fixture = await mount('bit-table');

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');

      await fixture.attr('loading', '');

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');

      await fixture.attr('loading', false);

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
    });

    it('sets aria-label on host when caption is provided', async () => {
      fixture = await mount('bit-table', { attrs: { caption: 'Quarterly sales' } });

      expect(fixture.element.getAttribute('aria-label')).toBe('Quarterly sales');
    });

    it('removes aria-label from host when caption is absent', async () => {
      fixture = await mount('bit-table');

      expect(fixture.element.hasAttribute('aria-label')).toBe(false);
    });

    it('updates aria-label reactively when caption changes', async () => {
      fixture = await mount('bit-table', { attrs: { caption: 'Initial' } });

      expect(fixture.element.getAttribute('aria-label')).toBe('Initial');

      await fixture.attr('caption', 'Updated');

      expect(fixture.element.getAttribute('aria-label')).toBe('Updated');
    });

    it('allows scope="col" on header cells', async () => {
      fixture = await mount('bit-table', {
        html: '<bit-tr head><bit-th scope="col">Name</bit-th></bit-tr>',
      });

      expect(fixture.element.querySelector('bit-th')?.getAttribute('scope')).toBe('col');
    });

    it('allows scope="row" on row header cells in body', async () => {
      fixture = await mount('bit-table', {
        html: '<bit-tr><bit-th scope="row">Alice</bit-th><bit-td>admin</bit-td></bit-tr>',
      });

      expect(fixture.element.querySelector('bit-th')?.getAttribute('scope')).toBe('row');
    });

    it('preserves accessible label when caption is provided', async () => {
      fixture = await mount('bit-table', {
        attrs: { caption: 'Sales Report' },
      });

      expect(fixture.element.getAttribute('aria-label')).toBe('Sales Report');
    });
  });

  // ─── Caption ─────────────────────────────────────────────────────────────────────

  describe('Caption', () => {
    it('renders caption text in the shadow DOM caption element', async () => {
      fixture = await mount('bit-table', { attrs: { caption: 'Weekly Report' } });

      expect(fixture.query('caption')?.textContent?.trim()).toBe('Weekly Report');
    });

    it('updates shadow DOM caption text reactively', async () => {
      fixture = await mount('bit-table', { attrs: { caption: 'Old Caption' } });

      expect(fixture.query('caption')?.textContent?.trim()).toBe('Old Caption');

      await fixture.attr('caption', 'Updated Caption');

      expect(fixture.query('caption')?.textContent?.trim()).toBe('Updated Caption');
    });

    it('hides caption element when caption is cleared', async () => {
      fixture = await mount('bit-table', { attrs: { caption: 'Initial' } });

      expect((fixture.query('caption') as HTMLElement | null)?.hidden).toBe(false);

      await fixture.attr('caption', false);

      expect((fixture.query('caption') as HTMLElement | null)?.hidden).toBe(true);
    });

    it('hides caption element for empty string caption', async () => {
      fixture = await mount('bit-table', { attrs: { caption: '' } });

      expect((fixture.query('caption') as HTMLElement | null)?.hidden).toBe(true);
    });
  });

  describe('Variants', () => {
    it('applies striped attribute to host', async () => {
      fixture = await mount('bit-table', { attrs: { striped: '' }, html: BODY_ROWS });

      expect(fixture.element.hasAttribute('striped')).toBe(true);
    });

    it('does not add striped attribute when not specified', async () => {
      fixture = await mount('bit-table', { html: BODY_ROWS });

      expect(fixture.element.hasAttribute('striped')).toBe(false);
    });

    it('applies bordered attribute to host', async () => {
      fixture = await mount('bit-table', { attrs: { bordered: '' } });

      expect(fixture.element.hasAttribute('bordered')).toBe(true);
    });

    it('applies color attribute to host', async () => {
      fixture = await mount('bit-table', { attrs: { color: 'success' } });

      expect(fixture.element.getAttribute('color')).toBe('success');
    });

    it('applies sticky attribute to host', async () => {
      fixture = await mount('bit-table', {
        attrs: { sticky: '' },
        html: ALL_ROWS,
      });

      expect(fixture.element.hasAttribute('sticky')).toBe(true);
    });

    it('applies size=sm attribute to host', async () => {
      fixture = await mount('bit-table', { attrs: { size: 'sm' } });

      expect(fixture.element.getAttribute('size')).toBe('sm');
    });

    it('applies size=lg attribute to host', async () => {
      fixture = await mount('bit-table', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('allows combining multiple visual variants simultaneously', async () => {
      fixture = await mount('bit-table', {
        attrs: { bordered: '', color: 'primary', size: 'sm', striped: '' },
        html: ALL_ROWS,
      });

      expect(fixture.element.hasAttribute('striped')).toBe(true);
      expect(fixture.element.hasAttribute('bordered')).toBe(true);
      expect(fixture.element.getAttribute('color')).toBe('primary');
      expect(fixture.element.getAttribute('size')).toBe('sm');
    });
  });

  // ─── Loading State ────────────────────────────────────────────────────────────

  describe('Loading State', () => {
    it('sets aria-busy=true when loading is active', async () => {
      fixture = await mount('bit-table', { attrs: { loading: '' }, html: BODY_ROWS });

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('sets aria-busy=false when loading is inactive', async () => {
      fixture = await mount('bit-table', { html: BODY_ROWS });

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
    });

    it('toggles aria-busy when loading attribute is added', async () => {
      fixture = await mount('bit-table');

      await fixture.attr('loading', '');

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('toggles aria-busy when loading attribute is removed', async () => {
      fixture = await mount('bit-table', { attrs: { loading: '' } });

      await fixture.attr('loading', false);

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('renders with no slot content without errors', async () => {
      fixture = await mount('bit-table');

      expect(fixture.query('.scroll-container')).toBeTruthy();
    });

    it('renders with only head rows', async () => {
      fixture = await mount('bit-table', { html: HEAD_ROW });

      expect(fixture.element.querySelector('bit-tr[head]')).toBeTruthy();
    });

    it('renders with only body rows', async () => {
      fixture = await mount('bit-table', { html: BODY_ROWS });

      expect(fixture.element.querySelector('bit-tr:not([head]):not([foot])')).toBeTruthy();
    });

    it('renders with all three row types', async () => {
      fixture = await mount('bit-table', { html: ALL_ROWS });

      expect(fixture.element.querySelector('bit-tr[head]')).toBeTruthy();
      expect(fixture.element.querySelector('bit-tr:not([head]):not([foot])')).toBeTruthy();
      expect(fixture.element.querySelector('bit-tr[foot]')).toBeTruthy();
    });

    it('handles rapid attribute toggling without errors', async () => {
      fixture = await mount('bit-table', { html: BODY_ROWS });

      await fixture.attr('loading', '');
      await fixture.attr('loading', false);
      await fixture.attr('loading', '');

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('multiple instances do not interfere with each other', async () => {
      fixture = await mount('bit-table', {
        attrs: { caption: 'Table A', striped: '' },
        html: BODY_ROWS,
      });

      const f2 = await mount('bit-table', {
        attrs: { bordered: '', caption: 'Table B' },
        html: BODY_ROWS,
      });

      expect(fixture.element.getAttribute('caption')).toBe('Table A');
      expect(f2.element.getAttribute('caption')).toBe('Table B');
      expect(fixture.element.hasAttribute('striped')).toBe(true);
      expect(fixture.element.hasAttribute('bordered')).toBe(false);
      expect(f2.element.hasAttribute('bordered')).toBe(true);

      f2.destroy();
    });

    it('handles all color themes without errors', async () => {
      for (const color of ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const) {
        const f = await mount('bit-table', { attrs: { color } });

        expect(f.element.getAttribute('color')).toBe(color);
        f.destroy();
      }
    });

    it('handles all size variants without errors', async () => {
      for (const size of ['sm', 'md', 'lg'] as const) {
        const f = await mount('bit-table', { attrs: { size } });

        expect(f.element.getAttribute('size')).toBe(size);
        f.destroy();
      }
    });
  });
});
