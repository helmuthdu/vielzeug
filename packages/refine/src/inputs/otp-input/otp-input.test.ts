import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-otp-input', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./otp-input'))();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a group container', async () => {
      fixture = await mount('ore-otp-input');

      expect(fixture.query('[role="group"]')).toBeTruthy();
    });

    it('renders 6 input cells by default', async () => {
      fixture = await mount('ore-otp-input');

      expect(fixture.shadow?.querySelectorAll('input.cell').length).toBe(6);
    });

    it('renders custom number of cells via length prop', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '4' } });

      expect(fixture.shadow?.querySelectorAll('input.cell').length).toBe(4);
    });

    it('each cell has part="cell"', async () => {
      fixture = await mount('ore-otp-input');

      expect(fixture.shadow?.querySelectorAll('[part="cell"]').length).toBe(6);
    });

    it('renders separator when separator prop is set', async () => {
      fixture = await mount('ore-otp-input', { attrs: { separator: '-' } });

      expect(fixture.query('.separator')).toBeTruthy();
    });

    it('does not render separator when separator prop is absent', async () => {
      fixture = await mount('ore-otp-input');

      expect(fixture.query('.separator')).toBeFalsy();
    });
  });

  // ─── Props ───────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('applies disabled attribute to all cells', async () => {
      fixture = await mount('ore-otp-input', { attrs: { disabled: '' } });

      const cells = fixture.shadow?.querySelectorAll<HTMLInputElement>('input.cell') ?? [];

      cells.forEach((cell) => {
        expect(cell.disabled).toBe(true);
      });
    });

    it('uses password type when masked prop is set', async () => {
      fixture = await mount('ore-otp-input', { attrs: { masked: '' } });

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      expect(firstCell?.type).toBe('password');
    });

    it('uses text type by default (not masked)', async () => {
      fixture = await mount('ore-otp-input');

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      expect(firstCell?.type).toBe('text');
    });

    it('uses numeric inputmode for numeric type', async () => {
      fixture = await mount('ore-otp-input', { attrs: { type: 'numeric' } });

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      expect(firstCell?.getAttribute('inputmode')).toBe('numeric');
    });

    it('uses text inputmode for alphanumeric type', async () => {
      fixture = await mount('ore-otp-input', { attrs: { type: 'alphanumeric' } });

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      expect(firstCell?.getAttribute('inputmode')).toBe('text');
    });

    it('first cell has autocomplete="one-time-code"', async () => {
      fixture = await mount('ore-otp-input');

      const firstCell = fixture.shadow?.querySelector<HTMLInputElement>('input.cell');

      expect(firstCell?.getAttribute('autocomplete')).toBe('one-time-code');
    });
  });

  // ─── Events ──────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('fires change after paste with complete=true', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '4' } });

      let detail: { complete: boolean; originalEvent?: Event; value: string } | undefined;

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
      expect(detail?.originalEvent).toBeDefined();
    });

    it('fires complete when all cells are filled via paste', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '4' } });

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

      const detail = (handler.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.originalEvent).toBeDefined();
    });
  });

  // ─── Typing & Keyboard ────────────────────────────────────────────────────────

  describe('Typing & Keyboard', () => {
    const typeInto = (input: HTMLInputElement, char: string) => {
      input.value = char;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    it('typing a digit auto-advances focus to the next cell', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '4' } });

      const cells = [...(fixture.shadow?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];

      cells[0].focus();
      typeInto(cells[0], '1');
      await fixture.flush();

      expect(fixture.shadow?.activeElement).toBe(cells[1]);
    });

    it('typing an invalid character (numeric type) is rejected', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '4', type: 'numeric' } });

      const cells = [...(fixture.shadow?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];

      typeInto(cells[0], 'a');
      await fixture.flush();

      expect(cells[0].value).toBe('');
    });

    it('typing the last digit fires complete', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '2' } });

      const handler = vi.fn();

      fixture.element.addEventListener('complete', handler);

      const cells = [...(fixture.shadow?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];

      typeInto(cells[0], '1');
      await fixture.flush();
      typeInto(cells[1], '2');
      await fixture.flush();

      expect(handler).toHaveBeenCalled();
      expect(fixture.element.getAttribute('value')).toBe('12');
    });

    it('Backspace on a filled cell clears it without moving focus', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '4' } });

      const cells = [...(fixture.shadow?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];

      typeInto(cells[0], '1');
      await fixture.flush();
      cells[0].focus();
      cells[0].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Backspace' }));
      await fixture.flush();

      expect(cells[0].value).toBe('');
      expect(fixture.shadow?.activeElement).toBe(cells[0]);
    });

    it('Backspace on an empty cell moves back and clears the previous cell', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '4' } });

      const cells = [...(fixture.shadow?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];

      typeInto(cells[0], '1');
      await fixture.flush();
      cells[1].focus();
      cells[1].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Backspace' }));
      await fixture.flush();

      expect(cells[0].value).toBe('');
      expect(fixture.shadow?.activeElement).toBe(cells[0]);
    });

    it('ArrowRight/ArrowLeft move focus between cells', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '4' } });

      const cells = [...(fixture.shadow?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];

      cells[0].focus();
      cells[0].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      await fixture.flush();

      expect(fixture.shadow?.activeElement).toBe(cells[1]);

      cells[1].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }));
      await fixture.flush();

      expect(fixture.shadow?.activeElement).toBe(cells[0]);
    });

    it('syncs cells when the value prop changes externally', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '4' } });

      fixture.element.setAttribute('value', '5678');
      await fixture.flush();
      await new Promise((r) => requestAnimationFrame(r));

      const cells = [...(fixture.shadow?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];

      expect(cells.map((c) => c.value).join('')).toBe('5678');
    });
  });
});

// ─── Form Integration ─────────────────────────────────────────────────────────

describe('ore-otp-input form integration', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./otp-input'))();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  it('registers the joined cell value as the form value (formAssociated)', async () => {
    const form = document.createElement('form');

    document.body.appendChild(form);
    fixture = await mount('ore-otp-input', { attrs: { length: '4', name: 'otp' }, container: form });

    const cells = [...(fixture.shadow?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];

    cells[0].value = '1';
    cells[0].dispatchEvent(new Event('input', { bubbles: true }));
    cells[1].value = '2';
    cells[1].dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.flush();

    expect(new FormData(form).get('otp')).toBe('12');
    form.remove();
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('ore-otp-input accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./otp-input'))();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('WAI-ARIA Group Pattern', () => {
    it('container has role="group"', async () => {
      fixture = await mount('ore-otp-input');

      expect(fixture.query('[role="group"]')).toBeTruthy();
    });

    it('group has the default aria-label "One-time password"', async () => {
      fixture = await mount('ore-otp-input');

      const group = fixture.query('[role="group"]');

      expect(group?.getAttribute('aria-label')).toBe('One-time password');
    });

    it('group aria-label reflects label prop', async () => {
      fixture = await mount('ore-otp-input', { attrs: { label: 'Security code' } });

      const group = fixture.query('[role="group"]');

      expect(group?.getAttribute('aria-label')).toBe('Security code');
    });
  });

  describe('Cell Labels', () => {
    it('each cell has a descriptive aria-label', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '3' } });

      const cells = fixture.shadow?.querySelectorAll('input.cell') ?? [];

      expect(cells[0]?.getAttribute('aria-label')).toBe('Digit 1 of 3');
      expect(cells[1]?.getAttribute('aria-label')).toBe('Digit 2 of 3');
      expect(cells[2]?.getAttribute('aria-label')).toBe('Digit 3 of 3');
    });

    it('cell label total reflects the length prop', async () => {
      fixture = await mount('ore-otp-input', { attrs: { length: '6' } });

      const lastCell = fixture.shadow?.querySelectorAll('input.cell')[5];

      expect(lastCell?.getAttribute('aria-label')).toBe('Digit 6 of 6');
    });
  });

  describe('Separator Accessibility', () => {
    it('separator span has aria-hidden="true"', async () => {
      fixture = await mount('ore-otp-input', {
        attrs: {
          length: '6',
          separator: '-',
        },
      });

      const sep = fixture.query('.separator');

      expect(sep?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-otp-input', { attrs: { label: 'One-time password', length: '6' } });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
