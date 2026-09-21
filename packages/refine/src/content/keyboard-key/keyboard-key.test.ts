import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-keyboard-key', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./keyboard-key');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  it('renders its label with keyboard semantics', async () => {
    fixture = await mount('ore-keyboard-key', { html: 'Enter' });

    expect(fixture.query('kbd')).toBeTruthy();
    expect(fixture.element.textContent).toBe('Enter');
  });

  it('renders a decorative symbol with a large key label', async () => {
    fixture = await mount('ore-keyboard-key', { attrs: { size: 'lg', symbol: '⌘' }, html: 'Command' });

    expect(fixture.query('.symbol')?.textContent).toBe('⌘');
    expect(fixture.query('.symbol')?.getAttribute('aria-hidden')).toBe('true');
    expect(fixture.query('.label slot')).toBeTruthy();
    expect(fixture.element.textContent).toBe('Command');
  });

  it('reflects the pressed state visually without adding an interactive role', async () => {
    fixture = await mount('ore-keyboard-key', { attrs: { pressed: '' }, html: 'K' });

    expect(fixture.query('.key')?.hasAttribute('data-pressed')).toBe(true);
    expect(fixture.query('.key')?.hasAttribute('role')).toBe(false);
  });

  it('groups multiple keys under one pressed shortcut surface', async () => {
    fixture = await mount('ore-keyboard-shortcut', {
      attrs: { pressed: '' },
      html: '<ore-keyboard-key size="lg">Command</ore-keyboard-key><ore-keyboard-key size="lg">K</ore-keyboard-key>',
    });

    expect(fixture.query('.shortcut')?.hasAttribute('data-pressed')).toBe(true);
    expect(fixture.query('.shortcut slot')).toBeTruthy();
    expect(fixture.element.querySelectorAll('ore-keyboard-key')).toHaveLength(2);
  });

  it('passes axe checks', async () => {
    fixture = await mount('ore-keyboard-key', { attrs: { size: 'lg', symbol: '⇧' }, html: 'Shift' });

    const results = await axeCheck(fixture.element);

    expect(results.violations).toHaveLength(0);
  });
});
