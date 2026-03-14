import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-otp-input', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./otp-input');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a group container', async () => {
      fixture = await mount('bit-otp-input');

      expect(fixture.query('[role="group"]')).toBeTruthy();
    });

    it('renders 6 input cells by default', async () => {
      fixture = await mount('bit-otp-input');

      expect(fixture.shadow?.querySelectorAll('input.cell').length).toBe(6);
    });

    it('renders custom number of cells via length prop', async () => {
      fixture = await mount('bit-otp-input', { attrs: { length: '4' } });

      expect(fixture.shadow?.querySelectorAll('input.cell').length).toBe(4);
    });

    it('each cell has part="cell"', async () => {
      fixture = await mount('bit-otp-input');

      expect(fixture.shadow?.querySelectorAll('[part="cell"]').length).toBe(6);
    });

    it('renders separator when separator prop is set', async () => {
      fixture = await mount('bit-otp-input', { attrs: { separator: '-' } });

      expect(fixture.query('.separator')).toBeTruthy();
    });

    it('does not render separator when separator prop is absent', async () => {
      fixture = await mount('bit-otp-input');

      expect(fixture.query('.separator')).toBeFalsy();
    });
  });

  // ─── Props ───────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('applies disabled attribute to all cells', async () => {
      fixture = await mount('bit-otp-input', { attrs: { disabled: '' } });

      const cells = fixture.shadow?.querySelectorAll<HTMLInputElement>('input.cell') ?? [];

      cells.forEach((cell) => {
        expect(cell.disabled).toBe(true);
      });
    });

    it('uses password type when masked prop is set', async () => {
      fixture = await mount('bit-otp-input', { attrs: { masked: '' } });

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      expect(firstCell?.type).toBe('password');
    });

    it('uses text type by default (not masked)', async () => {
      fixture = await mount('bit-otp-input');

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      expect(firstCell?.type).toBe('text');
    });

    it('uses numeric inputmode for numeric type', async () => {
      fixture = await mount('bit-otp-input', { attrs: { type: 'numeric' } });

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      expect(firstCell?.getAttribute('inputmode')).toBe('numeric');
    });

    it('uses text inputmode for alphanumeric type', async () => {
      fixture = await mount('bit-otp-input', { attrs: { type: 'alphanumeric' } });

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      expect(firstCell?.getAttribute('inputmode')).toBe('text');
    });

    it('first cell has autocomplete="one-time-code"', async () => {
      fixture = await mount('bit-otp-input');

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      expect(firstCell?.getAttribute('autocomplete')).toBe('one-time-code');
    });
  });

  // ─── Events ──────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('fires change after paste with complete=true', async () => {
      fixture = await mount('bit-otp-input', { attrs: { length: '4' } });

      let detail: { complete: boolean; value: string } | undefined;

      fixture.element.addEventListener('change', (e: Event) => {
        detail = (e as CustomEvent).detail;
      });

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      if (firstCell) {
        const clipboardData = { getData: () => '1234' } as unknown as DataTransfer;
        const pasteEvent = new ClipboardEvent('paste', { bubbles: true, clipboardData });

        firstCell.dispatchEvent(pasteEvent);
        await fixture.flush();
      }

      expect(detail?.complete).toBe(true);
    });

    it('fires complete when all cells are filled via paste', async () => {
      fixture = await mount('bit-otp-input', { attrs: { length: '4' } });

      const handler = vi.fn();

      fixture.element.addEventListener('complete', handler);

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      if (firstCell) {
        const clipboardData = { getData: () => '1234' } as unknown as DataTransfer;
        const pasteEvent = new ClipboardEvent('paste', { bubbles: true, clipboardData });

        firstCell.dispatchEvent(pasteEvent);
        await fixture.flush();
      }

      expect(handler).toHaveBeenCalled();
    });
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('bit-otp-input accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./otp-input');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('WAI-ARIA Group Pattern', () => {
    it('container has role="group"', async () => {
      fixture = await mount('bit-otp-input');

      expect(fixture.query('[role="group"]')).toBeTruthy();
    });

    it('group has the default aria-label "One-time password"', async () => {
      fixture = await mount('bit-otp-input');

      const group = fixture.query('[role="group"]');

      expect(group?.getAttribute('aria-label')).toBe('One-time password');
    });

    it('group aria-label reflects label prop', async () => {
      fixture = await mount('bit-otp-input', { attrs: { label: 'Security code' } });

      const group = fixture.query('[role="group"]');

      expect(group?.getAttribute('aria-label')).toBe('Security code');
    });
  });

  describe('Cell Labels', () => {
    it('each cell has a descriptive aria-label', async () => {
      fixture = await mount('bit-otp-input', { attrs: { length: '3' } });

      const cells = fixture.shadow?.querySelectorAll('input.cell') ?? [];

      expect(cells[0]?.getAttribute('aria-label')).toBe('Digit 1 of 3');
      expect(cells[1]?.getAttribute('aria-label')).toBe('Digit 2 of 3');
      expect(cells[2]?.getAttribute('aria-label')).toBe('Digit 3 of 3');
    });

    it('cell label total reflects the length prop', async () => {
      fixture = await mount('bit-otp-input', { attrs: { length: '6' } });

      const lastCell = fixture.shadow?.querySelectorAll('input.cell')[5];

      expect(lastCell?.getAttribute('aria-label')).toBe('Digit 6 of 6');
    });
  });

  describe('Separator Accessibility', () => {
    it('separator span has aria-hidden="true"', async () => {
      fixture = await mount('bit-otp-input', { attrs: { length: '6', separator: '-' } });

      const sep = fixture.query('.separator');

      expect(sep?.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
