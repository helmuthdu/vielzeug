import { fireClick, fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-splitter', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./splitter');
  });
  afterEach(() => {
    fixture?.dispose();
    vi.restoreAllMocks();
  });

  it('updates the pane value through buttons and keyboard with user events', async () => {
    fixture = await mount('ore-splitter', {
      attrs: { label: 'Files', max: '60', min: '20', 'show-buttons': '', value: '35' },
    });
    const changes: Array<[string, number]> = [];
    for (const type of ['input', 'change']) {
      fixture.element.addEventListener(type, (event) => {
        changes.push([type, (event as CustomEvent<{ value: number }>).detail.value]);
      });
    }

    fireClick(fixture.query('[part="increase"]')!);
    await fixture.flush();
    expect(fixture.element.getAttribute('value')).toBe('40');
    expect(changes).toEqual([
      ['input', 40],
      ['change', 40],
    ]);

    fireKeyDown(fixture.query('[role="separator"]')!, { key: 'End' });
    await fixture.flush();
    expect(fixture.query('[role="separator"]')?.getAttribute('aria-valuenow')).toBe('60');
    expect((await axeCheck(fixture.element)).violations).toHaveLength(0);
  });

  it('disables interaction for invalid configuration and recovers when fixed', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fixture = await mount('ore-splitter', { attrs: { max: '10', min: '90', 'show-buttons': '' } });
    const control = fixture.query('[role="separator"]')!;

    expect(control.getAttribute('aria-disabled')).toBe('true');
    expect(warning).toHaveBeenCalled();
    const previousValue = fixture.element.getAttribute('value');
    fireClick(fixture.query('[part="increase"]')!);
    expect(fixture.element.getAttribute('value')).toBe(previousValue);
    await fixture.attr('max', '100');
    expect(control.getAttribute('aria-disabled')).toBe('false');
    expect(fixture.element.getAttribute('value')).toBe('90');
  });

  it('updates programmatically without emitting interaction events', async () => {
    fixture = await mount('ore-splitter');
    const change = vi.fn();

    fixture.element.addEventListener('change', change);
    await fixture.attr('value', '70');
    expect(fixture.query('[role="separator"]')?.getAttribute('aria-valuenow')).toBe('70');
    expect(change).not.toHaveBeenCalled();
  });

  it('toggles optional buttons without disabling keyboard resizing', async () => {
    fixture = await mount('ore-splitter');
    const increase = fixture.query<HTMLButtonElement>('[part="increase"]')!;
    const separator = fixture.query('[role="separator"]')!;

    expect(increase.hidden).toBe(true);
    fireKeyDown(separator, { key: 'End' });
    await fixture.flush();
    expect(separator.getAttribute('aria-valuenow')).toBe('90');
    await fixture.attr('show-buttons', '');
    expect(increase.hidden).toBe(false);
    fixture.element.removeAttribute('show-buttons');
    await fixture.flush();
    expect(increase.hidden).toBe(true);
  });
});
