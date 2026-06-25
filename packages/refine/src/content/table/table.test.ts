import { type Fixture, mount } from '@vielzeug/ore/testing';

// ── API summary ───────────────────────────────────────────────────────────────
// ore-table reads light-DOM ore-tr/ore-th/ore-td markers and projects them
// into a fully-native shadow <table>. Tests query the shadow tree for the
// generated native structure and the light DOM for the source markers.
//
// Light DOM consumer API:
//   <ore-tr head><ore-th>…</ore-th></ore-tr>  → thead (scope="col" auto-inferred)
//   <ore-tr><ore-td>…</ore-td></ore-tr>       → tbody
//   <ore-tr foot><ore-td>…</ore-td></ore-tr>  → tfoot

const HEAD_ROW = `<ore-tr head><ore-th>Name</ore-th><ore-th>Email</ore-th></ore-tr>`;
const BODY_ROWS = `<ore-tr><ore-td>Alice</ore-td><ore-td>alice@example.com</ore-td></ore-tr><ore-tr><ore-td>Bob</ore-td><ore-td>bob@example.com</ore-td></ore-tr>`;
const FOOT_ROW = `<ore-tr foot><ore-td colspan="2">2 users</ore-td></ore-tr>`;
const ALL_ROWS = HEAD_ROW + BODY_ROWS + FOOT_ROW;

describe('ore-table', () => {
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
      fixture = await mount('ore-table');

      expect(fixture.query('.scroll-container')).toBeTruthy();
    });

    it('renders a native <table> inside .scroll-container', async () => {
      fixture = await mount('ore-table');

      expect(fixture.query('table')).toBeTruthy();
    });

    it('renders <thead>, <tbody>, <tfoot> inside the table', async () => {
      fixture = await mount('ore-table');

      expect(fixture.query('thead')).toBeTruthy();
      expect(fixture.query('tbody')).toBeTruthy();
      expect(fixture.query('tfoot')).toBeTruthy();
    });

    it('renders a <caption> inside the table', async () => {
      fixture = await mount('ore-table');

      expect(fixture.query('caption')).toBeTruthy();
    });
  });

  // ─── Row projection ───────────────────────────────────────────────────────────
  // Verifies that ore-tr[head]/ore-tr/ore-tr[foot] markers are projected into
  // the correct native section in the shadow <table>.

  describe('Row projection', () => {
    it('projects ore-tr[head] cells into thead', async () => {
      fixture = await mount('ore-table', { html: HEAD_ROW });

      expect(fixture.query('thead tr')).toBeTruthy();
      expect(fixture.query('tbody tr')).toBeFalsy();
    });

    it('projects plain ore-tr cells into tbody', async () => {
      fixture = await mount('ore-table', { html: BODY_ROWS });

      expect(fixture.query('tbody tr')).toBeTruthy();
      expect(fixture.query('thead tr')).toBeFalsy();
    });

    it('projects ore-tr[foot] cells into tfoot', async () => {
      fixture = await mount('ore-table', { html: FOOT_ROW });

      expect(fixture.query('tfoot tr')).toBeTruthy();
      expect(fixture.query('tbody tr')).toBeFalsy();
    });

    it('projects all three section types simultaneously', async () => {
      fixture = await mount('ore-table', { html: ALL_ROWS });

      expect(fixture.query('thead tr')).toBeTruthy();
      expect(fixture.query('tbody tr')).toBeTruthy();
      expect(fixture.query('tfoot tr')).toBeTruthy();
    });

    it('mirrors colspan from ore-td to native td', async () => {
      fixture = await mount('ore-table', { html: FOOT_ROW });

      const td = fixture.query('td') as HTMLTableCellElement;

      expect(td.getAttribute('colspan')).toBe('2');
      expect(td.colSpan).toBe(2);
    });

    it('auto-infers scope="col" on ore-th in thead when omitted', async () => {
      fixture = await mount('ore-table', { html: HEAD_ROW });

      expect(fixture.query('thead th')?.getAttribute('scope')).toBe('col');
    });

    it('mirrors text content from ore-td to native td', async () => {
      fixture = await mount('ore-table', { html: BODY_ROWS });

      expect(fixture.query('tbody td')?.textContent).toBe('Alice');
    });

    it('generates two body rows for two ore-tr markers', async () => {
      fixture = await mount('ore-table', { html: BODY_ROWS });

      expect(fixture.queryAll('tbody tr').length).toBe(2);
    });
  });

  // ─── Cell sync ────────────────────────────────────────────────────────────────
  // Verifies the MutationObserver keeps shadow cells in sync with light-DOM changes.

  describe('Cell sync', () => {
    it('syncs text content change on ore-td to native td', async () => {
      fixture = await mount('ore-table', { html: BODY_ROWS });

      const source = fixture.element.querySelector('ore-td') as HTMLElement;

      source.textContent = 'Updated';
      await fixture.flush();

      expect(fixture.query('tbody td')?.textContent).toBe('Updated');
    });

    it('syncs colspan attribute change on ore-td to native td', async () => {
      fixture = await mount('ore-table', { html: FOOT_ROW });

      const source = fixture.element.querySelector('ore-td') as HTMLElement;

      source.setAttribute('colspan', '3');
      await fixture.flush();

      expect((fixture.query('tfoot td') as HTMLTableCellElement).colSpan).toBe(3);
    });

    it('syncs scope attribute change on ore-th to native th', async () => {
      fixture = await mount('ore-table', { html: HEAD_ROW });

      const source = fixture.element.querySelector('ore-th') as HTMLElement;

      source.setAttribute('scope', 'colgroup');
      await fixture.flush();

      expect(fixture.query('thead th')?.getAttribute('scope')).toBe('colgroup');
    });

    it('removing explicit scope from ore-th reverts to inferred value', async () => {
      fixture = await mount('ore-table', {
        html: `<ore-tr head><ore-th scope="colgroup">Group</ore-th></ore-tr>`,
      });

      const source = fixture.element.querySelector('ore-th') as HTMLElement;

      expect(fixture.query('thead th')?.getAttribute('scope')).toBe('colgroup');

      source.removeAttribute('scope');
      await fixture.flush();

      expect(fixture.query('thead th')?.getAttribute('scope')).toBe('col');
    });

    it('removing explicit scope from tbody ore-th reverts to "row"', async () => {
      fixture = await mount('ore-table', {
        html: `<ore-tr><ore-th scope="colgroup">Label</ore-th><ore-td>value</ore-td></ore-tr>`,
      });

      const source = fixture.element.querySelector('ore-th') as HTMLElement;

      source.removeAttribute('scope');
      await fixture.flush();

      expect(fixture.query('tbody th')?.getAttribute('scope')).toBe('row');
    });
  });

  // ─── Structural reactivity ────────────────────────────────────────────────────
  // Verifies full rebuild triggers on ore-tr add/remove.

  describe('Structural reactivity', () => {
    it('adding a ore-tr increases tbody row count', async () => {
      fixture = await mount('ore-table', { html: BODY_ROWS });

      const initialCount = fixture.queryAll('tbody tr').length;
      const newRow = document.createElement('ore-tr');
      const newCell = document.createElement('ore-td');

      newCell.textContent = 'Charlie';
      newRow.appendChild(newCell);
      fixture.element.appendChild(newRow);
      await fixture.flush();

      expect(fixture.queryAll('tbody tr').length).toBe(initialCount + 1);
    });

    it('removing a ore-tr decreases tbody row count', async () => {
      fixture = await mount('ore-table', { html: BODY_ROWS });

      fixture.element.querySelector('ore-tr')?.remove();
      await fixture.flush();

      expect(fixture.queryAll('tbody tr').length).toBe(1);
    });
  });

  // ─── Caption ──────────────────────────────────────────────────────────────────

  describe('Caption', () => {
    it('hides caption when caption attr is absent', async () => {
      fixture = await mount('ore-table');

      expect((fixture.query('caption') as HTMLElement).hidden).toBe(true);
    });

    it('shows caption when caption attr is set', async () => {
      fixture = await mount('ore-table', { attrs: { caption: 'Users' } });

      expect((fixture.query('caption') as HTMLElement).hidden).toBe(false);
    });

    it('hides caption for empty string', async () => {
      fixture = await mount('ore-table', { attrs: { caption: '' } });

      expect((fixture.query('caption') as HTMLElement).hidden).toBe(true);
    });

    it('renders caption text content', async () => {
      fixture = await mount('ore-table', { attrs: { caption: 'Weekly Report' } });

      expect(fixture.query('caption')?.textContent?.trim()).toBe('Weekly Report');
    });

    it('updates caption text reactively', async () => {
      fixture = await mount('ore-table', { attrs: { caption: 'Old' } });

      await fixture.attr('caption', 'New');

      expect(fixture.query('caption')?.textContent?.trim()).toBe('New');
    });

    it('hides caption when caption is cleared', async () => {
      fixture = await mount('ore-table', { attrs: { caption: 'Initial' } });

      await fixture.attr('caption', false);

      expect((fixture.query('caption') as HTMLElement).hidden).toBe(true);
    });
  });

  // ─── Accessibility ────────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('does not set aria-busy when loading is absent', async () => {
      fixture = await mount('ore-table');

      expect(fixture.element.hasAttribute('aria-busy')).toBe(false);
    });

    it('sets aria-busy="true" when loading is set', async () => {
      fixture = await mount('ore-table', { attrs: { loading: '' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('updates aria-busy reactively', async () => {
      fixture = await mount('ore-table');

      await fixture.attr('loading', '');
      expect(fixture.element.getAttribute('aria-busy')).toBe('true');

      await fixture.attr('loading', false);
      expect(fixture.element.hasAttribute('aria-busy')).toBe(false);
    });

    it('does not set aria-label when caption is absent', async () => {
      fixture = await mount('ore-table');

      expect(fixture.element.hasAttribute('aria-label')).toBe(false);
    });

    it('sets aria-label from caption prop', async () => {
      fixture = await mount('ore-table', { attrs: { caption: 'Quarterly sales' } });

      expect(fixture.element.getAttribute('aria-label')).toBe('Quarterly sales');
    });

    it('updates aria-label reactively', async () => {
      fixture = await mount('ore-table', { attrs: { caption: 'Initial' } });

      await fixture.attr('caption', 'Updated');

      expect(fixture.element.getAttribute('aria-label')).toBe('Updated');
    });

    it('removes aria-label when caption is cleared', async () => {
      fixture = await mount('ore-table', { attrs: { caption: 'Initial' } });

      await fixture.attr('caption', false);

      expect(fixture.element.hasAttribute('aria-label')).toBe(false);
    });

    it('auto-infers scope="col" on thead ore-th when omitted', async () => {
      fixture = await mount('ore-table', {
        html: `<ore-tr head><ore-th>Name</ore-th></ore-tr>`,
      });

      expect(fixture.query('thead th')?.getAttribute('scope')).toBe('col');
    });

    it('auto-infers scope="row" on tbody ore-th when omitted', async () => {
      fixture = await mount('ore-table', {
        html: `<ore-tr><ore-th>Alice</ore-th><ore-td>admin</ore-td></ore-tr>`,
      });

      expect(fixture.query('tbody th')?.getAttribute('scope')).toBe('row');
    });

    it('respects explicit scope when provided on ore-th', async () => {
      fixture = await mount('ore-table', {
        html: `<ore-tr head><ore-th scope="colgroup">Group</ore-th></ore-tr>`,
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
      fixture = await mount('ore-table', { attrs: { [prop]: value } });

      expect(fixture.element.hasAttribute(prop)).toBe(true);
    });

    it.each([['striped'], ['bordered'], ['loading'], ['sticky'], ['fullwidth']] as const)(
      'boolean prop "%s" is absent by default',
      async (prop) => {
        fixture = await mount('ore-table');

        expect(fixture.element.hasAttribute(prop)).toBe(false);
      },
    );

    it.each(['compact', 'cozy', 'comfortable'] as const)('reflects density="%s" as host attribute', async (density) => {
      fixture = await mount('ore-table', { attrs: { density } });

      expect(fixture.element.getAttribute('density')).toBe(density);
    });

    it('reflects caption string as host attribute', async () => {
      fixture = await mount('ore-table', { attrs: { caption: 'My Table' } });

      expect(fixture.element.getAttribute('caption')).toBe('My Table');
    });

    it('allows combining multiple variants simultaneously', async () => {
      fixture = await mount('ore-table', {
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
      fixture = await mount('ore-table');

      expect(fixture.query('table')).toBeTruthy();
      expect(fixture.queryAll('tr').length).toBe(0);
    });

    it('renders with only head rows', async () => {
      fixture = await mount('ore-table', { html: HEAD_ROW });

      expect(fixture.query('thead tr')).toBeTruthy();
      expect(fixture.query('tbody tr')).toBeFalsy();
    });

    it('renders with only foot rows', async () => {
      fixture = await mount('ore-table', { html: FOOT_ROW });

      expect(fixture.query('tfoot tr')).toBeTruthy();
      expect(fixture.query('tbody tr')).toBeFalsy();
    });

    it('handles rapid loading attribute toggling', async () => {
      fixture = await mount('ore-table');

      await fixture.attr('loading', '');
      await fixture.attr('loading', false);
      await fixture.attr('loading', '');

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('multiple instances are isolated from each other', async () => {
      fixture = await mount('ore-table', {
        attrs: { caption: 'Table A', striped: '' },
        html: BODY_ROWS,
      });

      const f2 = await mount('ore-table', {
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
      fixture = await mount('ore-table', {
        attrs: { caption: 'Users' },
        html: `<tr><th>Name</th><th>Age</th></tr><tr><td>Alice</td><td>30</td></tr>`,
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
