import { type Fixture, mount } from '@vielzeug/craft/testing';

// ── API summary ───────────────────────────────────────────────────────────────
// sg-table reads light-DOM sg-tr/sg-th/sg-td markers and projects them
// into a fully-native shadow <table>. Tests query the shadow tree for the
// generated native structure and the light DOM for the source markers.
//
// Light DOM consumer API:
//   <sg-tr head><sg-th>…</sg-th></sg-tr>  → thead (scope="col" auto-inferred)
//   <sg-tr><sg-td>…</sg-td></sg-tr>       → tbody
//   <sg-tr foot><sg-td>…</sg-td></sg-tr>  → tfoot

const HEAD_ROW = `<sg-tr head><sg-th>Name</sg-th><sg-th>Email</sg-th></sg-tr>`;
const BODY_ROWS = `<sg-tr><sg-td>Alice</sg-td><sg-td>alice@example.com</sg-td></sg-tr><sg-tr><sg-td>Bob</sg-td><sg-td>bob@example.com</sg-td></sg-tr>`;
const FOOT_ROW = `<sg-tr foot><sg-td colspan="2">2 users</sg-td></sg-tr>`;
const ALL_ROWS = HEAD_ROW + BODY_ROWS + FOOT_ROW;

describe('sg-table', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./table');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Shadow structure ─────────────────────────────────────────────────────────

  describe('Shadow structure', () => {
    it('renders a .scroll-container inside the shadow root', async () => {
      fixture = await mount('sg-table');

      expect(fixture.query('.scroll-container')).toBeTruthy();
    });

    it('renders a native <table> inside .scroll-container', async () => {
      fixture = await mount('sg-table');

      expect(fixture.query('table')).toBeTruthy();
    });

    it('renders <thead>, <tbody>, <tfoot> inside the table', async () => {
      fixture = await mount('sg-table');

      expect(fixture.query('thead')).toBeTruthy();
      expect(fixture.query('tbody')).toBeTruthy();
      expect(fixture.query('tfoot')).toBeTruthy();
    });

    it('renders a <caption> inside the table', async () => {
      fixture = await mount('sg-table');

      expect(fixture.query('caption')).toBeTruthy();
    });
  });

  // ─── Row projection ───────────────────────────────────────────────────────────
  // Verifies that sg-tr[head]/sg-tr/sg-tr[foot] markers are projected into
  // the correct native section in the shadow <table>.

  describe('Row projection', () => {
    it('projects sg-tr[head] cells into thead', async () => {
      fixture = await mount('sg-table', { html: HEAD_ROW });

      expect(fixture.query('thead tr')).toBeTruthy();
      expect(fixture.query('tbody tr')).toBeFalsy();
    });

    it('projects plain sg-tr cells into tbody', async () => {
      fixture = await mount('sg-table', { html: BODY_ROWS });

      expect(fixture.query('tbody tr')).toBeTruthy();
      expect(fixture.query('thead tr')).toBeFalsy();
    });

    it('projects sg-tr[foot] cells into tfoot', async () => {
      fixture = await mount('sg-table', { html: FOOT_ROW });

      expect(fixture.query('tfoot tr')).toBeTruthy();
      expect(fixture.query('tbody tr')).toBeFalsy();
    });

    it('projects all three section types simultaneously', async () => {
      fixture = await mount('sg-table', { html: ALL_ROWS });

      expect(fixture.query('thead tr')).toBeTruthy();
      expect(fixture.query('tbody tr')).toBeTruthy();
      expect(fixture.query('tfoot tr')).toBeTruthy();
    });

    it('mirrors colspan from sg-td to native td', async () => {
      fixture = await mount('sg-table', { html: FOOT_ROW });

      const td = fixture.query('td') as HTMLTableCellElement;

      expect(td.getAttribute('colspan')).toBe('2');
      expect(td.colSpan).toBe(2);
    });

    it('auto-infers scope="col" on sg-th in thead when omitted', async () => {
      fixture = await mount('sg-table', { html: HEAD_ROW });

      expect(fixture.query('thead th')?.getAttribute('scope')).toBe('col');
    });

    it('mirrors text content from sg-td to native td', async () => {
      fixture = await mount('sg-table', { html: BODY_ROWS });

      expect(fixture.query('tbody td')?.textContent).toBe('Alice');
    });

    it('generates two body rows for two sg-tr markers', async () => {
      fixture = await mount('sg-table', { html: BODY_ROWS });

      expect(fixture.queryAll('tbody tr').length).toBe(2);
    });
  });

  // ─── Cell sync ────────────────────────────────────────────────────────────────
  // Verifies the MutationObserver keeps shadow cells in sync with light-DOM changes.

  describe('Cell sync', () => {
    it('syncs text content change on sg-td to native td', async () => {
      fixture = await mount('sg-table', { html: BODY_ROWS });

      const source = fixture.element.querySelector('sg-td') as HTMLElement;

      source.textContent = 'Updated';
      await fixture.flush();

      expect(fixture.query('tbody td')?.textContent).toBe('Updated');
    });

    it('syncs colspan attribute change on sg-td to native td', async () => {
      fixture = await mount('sg-table', { html: FOOT_ROW });

      const source = fixture.element.querySelector('sg-td') as HTMLElement;

      source.setAttribute('colspan', '3');
      await fixture.flush();

      expect((fixture.query('tfoot td') as HTMLTableCellElement).colSpan).toBe(3);
    });

    it('syncs scope attribute change on sg-th to native th', async () => {
      fixture = await mount('sg-table', { html: HEAD_ROW });

      const source = fixture.element.querySelector('sg-th') as HTMLElement;

      source.setAttribute('scope', 'colgroup');
      await fixture.flush();

      expect(fixture.query('thead th')?.getAttribute('scope')).toBe('colgroup');
    });

    it('removing explicit scope from sg-th reverts to inferred value', async () => {
      fixture = await mount('sg-table', {
        html: `<sg-tr head><sg-th scope="colgroup">Group</sg-th></sg-tr>`,
      });

      const source = fixture.element.querySelector('sg-th') as HTMLElement;

      expect(fixture.query('thead th')?.getAttribute('scope')).toBe('colgroup');

      source.removeAttribute('scope');
      await fixture.flush();

      expect(fixture.query('thead th')?.getAttribute('scope')).toBe('col');
    });

    it('removing explicit scope from tbody sg-th reverts to "row"', async () => {
      fixture = await mount('sg-table', {
        html: `<sg-tr><sg-th scope="colgroup">Label</sg-th><sg-td>value</sg-td></sg-tr>`,
      });

      const source = fixture.element.querySelector('sg-th') as HTMLElement;

      source.removeAttribute('scope');
      await fixture.flush();

      expect(fixture.query('tbody th')?.getAttribute('scope')).toBe('row');
    });
  });

  // ─── Structural reactivity ────────────────────────────────────────────────────
  // Verifies full rebuild triggers on sg-tr add/remove.

  describe('Structural reactivity', () => {
    it('adding a sg-tr increases tbody row count', async () => {
      fixture = await mount('sg-table', { html: BODY_ROWS });

      const initialCount = fixture.queryAll('tbody tr').length;
      const newRow = document.createElement('sg-tr');
      const newCell = document.createElement('sg-td');

      newCell.textContent = 'Charlie';
      newRow.appendChild(newCell);
      fixture.element.appendChild(newRow);
      await fixture.flush();

      expect(fixture.queryAll('tbody tr').length).toBe(initialCount + 1);
    });

    it('removing a sg-tr decreases tbody row count', async () => {
      fixture = await mount('sg-table', { html: BODY_ROWS });

      fixture.element.querySelector('sg-tr')?.remove();
      await fixture.flush();

      expect(fixture.queryAll('tbody tr').length).toBe(1);
    });
  });

  // ─── Caption ──────────────────────────────────────────────────────────────────

  describe('Caption', () => {
    it('hides caption when caption attr is absent', async () => {
      fixture = await mount('sg-table');

      expect((fixture.query('caption') as HTMLElement).hidden).toBe(true);
    });

    it('shows caption when caption attr is set', async () => {
      fixture = await mount('sg-table', { attrs: { caption: 'Users' } });

      expect((fixture.query('caption') as HTMLElement).hidden).toBe(false);
    });

    it('hides caption for empty string', async () => {
      fixture = await mount('sg-table', { attrs: { caption: '' } });

      expect((fixture.query('caption') as HTMLElement).hidden).toBe(true);
    });

    it('renders caption text content', async () => {
      fixture = await mount('sg-table', { attrs: { caption: 'Weekly Report' } });

      expect(fixture.query('caption')?.textContent?.trim()).toBe('Weekly Report');
    });

    it('updates caption text reactively', async () => {
      fixture = await mount('sg-table', { attrs: { caption: 'Old' } });

      await fixture.attr('caption', 'New');

      expect(fixture.query('caption')?.textContent?.trim()).toBe('New');
    });

    it('hides caption when caption is cleared', async () => {
      fixture = await mount('sg-table', { attrs: { caption: 'Initial' } });

      await fixture.attr('caption', false);

      expect((fixture.query('caption') as HTMLElement).hidden).toBe(true);
    });
  });

  // ─── Accessibility ────────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('does not set aria-busy when loading is absent', async () => {
      fixture = await mount('sg-table');

      expect(fixture.element.hasAttribute('aria-busy')).toBe(false);
    });

    it('sets aria-busy="true" when loading is set', async () => {
      fixture = await mount('sg-table', { attrs: { loading: '' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('updates aria-busy reactively', async () => {
      fixture = await mount('sg-table');

      await fixture.attr('loading', '');
      expect(fixture.element.getAttribute('aria-busy')).toBe('true');

      await fixture.attr('loading', false);
      expect(fixture.element.hasAttribute('aria-busy')).toBe(false);
    });

    it('does not set aria-label when caption is absent', async () => {
      fixture = await mount('sg-table');

      expect(fixture.element.hasAttribute('aria-label')).toBe(false);
    });

    it('sets aria-label from caption prop', async () => {
      fixture = await mount('sg-table', { attrs: { caption: 'Quarterly sales' } });

      expect(fixture.element.getAttribute('aria-label')).toBe('Quarterly sales');
    });

    it('updates aria-label reactively', async () => {
      fixture = await mount('sg-table', { attrs: { caption: 'Initial' } });

      await fixture.attr('caption', 'Updated');

      expect(fixture.element.getAttribute('aria-label')).toBe('Updated');
    });

    it('removes aria-label when caption is cleared', async () => {
      fixture = await mount('sg-table', { attrs: { caption: 'Initial' } });

      await fixture.attr('caption', false);

      expect(fixture.element.hasAttribute('aria-label')).toBe(false);
    });

    it('auto-infers scope="col" on thead sg-th when omitted', async () => {
      fixture = await mount('sg-table', {
        html: `<sg-tr head><sg-th>Name</sg-th></sg-tr>`,
      });

      expect(fixture.query('thead th')?.getAttribute('scope')).toBe('col');
    });

    it('auto-infers scope="row" on tbody sg-th when omitted', async () => {
      fixture = await mount('sg-table', {
        html: `<sg-tr><sg-th>Alice</sg-th><sg-td>admin</sg-td></sg-tr>`,
      });

      expect(fixture.query('tbody th')?.getAttribute('scope')).toBe('row');
    });

    it('respects explicit scope when provided on sg-th', async () => {
      fixture = await mount('sg-table', {
        html: `<sg-tr head><sg-th scope="colgroup">Group</sg-th></sg-tr>`,
      });

      expect(fixture.query('thead th')?.getAttribute('scope')).toBe('colgroup');
    });
  });

  // ─── Props ────────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it.each([
      ['striped', ''],
      ['bordered', ''],
      ['loading', ''],
      ['sticky', ''],
      ['fullwidth', ''],
    ] as const)('reflects boolean prop "%s" as host attribute', async (prop, value) => {
      fixture = await mount('sg-table', { attrs: { [prop]: value } });

      expect(fixture.element.hasAttribute(prop)).toBe(true);
    });

    it.each([['striped'], ['bordered'], ['loading'], ['sticky'], ['fullwidth']] as const)(
      'boolean prop "%s" is absent by default',
      async (prop) => {
        fixture = await mount('sg-table');

        expect(fixture.element.hasAttribute(prop)).toBe(false);
      },
    );

    it.each(['compact', 'cozy', 'comfortable'] as const)('reflects density="%s" as host attribute', async (density) => {
      fixture = await mount('sg-table', { attrs: { density } });

      expect(fixture.element.getAttribute('density')).toBe(density);
    });

    it('reflects caption string as host attribute', async () => {
      fixture = await mount('sg-table', { attrs: { caption: 'My Table' } });

      expect(fixture.element.getAttribute('caption')).toBe('My Table');
    });

    it('allows combining multiple variants simultaneously', async () => {
      fixture = await mount('sg-table', {
        attrs: { bordered: '', density: 'compact', striped: '' },
        html: ALL_ROWS,
      });

      expect(fixture.element.hasAttribute('striped')).toBe(true);
      expect(fixture.element.hasAttribute('bordered')).toBe(true);
      expect(fixture.element.getAttribute('density')).toBe('compact');
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('renders with no rows', async () => {
      fixture = await mount('sg-table');

      expect(fixture.query('table')).toBeTruthy();
      expect(fixture.queryAll('tr').length).toBe(0);
    });

    it('renders with only head rows', async () => {
      fixture = await mount('sg-table', { html: HEAD_ROW });

      expect(fixture.query('thead tr')).toBeTruthy();
      expect(fixture.query('tbody tr')).toBeFalsy();
    });

    it('renders with only foot rows', async () => {
      fixture = await mount('sg-table', { html: FOOT_ROW });

      expect(fixture.query('tfoot tr')).toBeTruthy();
      expect(fixture.query('tbody tr')).toBeFalsy();
    });

    it('handles rapid loading attribute toggling', async () => {
      fixture = await mount('sg-table');

      await fixture.attr('loading', '');
      await fixture.attr('loading', false);
      await fixture.attr('loading', '');

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('multiple instances are isolated from each other', async () => {
      fixture = await mount('sg-table', {
        attrs: { caption: 'Table A', striped: '' },
        html: BODY_ROWS,
      });

      const f2 = await mount('sg-table', {
        attrs: { bordered: '', caption: 'Table B' },
        html: BODY_ROWS,
      });

      expect(fixture.element.getAttribute('caption')).toBe('Table A');
      expect(f2.element.getAttribute('caption')).toBe('Table B');
      expect(fixture.element.hasAttribute('bordered')).toBe(false);
      expect(f2.element.hasAttribute('bordered')).toBe(true);

      f2.destroy();
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('sg-table', {
        attrs: { caption: 'Users' },
        html: `<tr><th>Name</th><th>Age</th></tr><tr><td>Alice</td><td>30</td></tr>`,
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
