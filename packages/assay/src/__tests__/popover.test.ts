import { installPopoverPolyfill } from '../popover';

describe('installPopoverPolyfill()', () => {
  let uninstall: (() => void) | undefined;

  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
    document.body.replaceChildren();
  });

  const popover = (): HTMLElement => {
    const panel = document.createElement('div');

    panel.setAttribute('popover', 'manual');
    panel.innerHTML = '<div class="row" tabindex="-1">Row</div>';
    document.body.append(panel);

    return panel;
  };

  it('adds the Popover API methods jsdom lacks', () => {
    uninstall = installPopoverPolyfill();

    const panel = popover();
    const api = panel as HTMLElement & { showPopover: () => void; hidePopover: () => void };

    expect(typeof api.showPopover).toBe('function');
    expect(typeof api.hidePopover).toBe('function');
    expect(typeof api.togglePopover).toBe('function');
  });

  it('reflects open state through the popover-open attribute', () => {
    uninstall = installPopoverPolyfill();

    const panel = popover();
    const api = panel as HTMLElement & { showPopover: () => void; hidePopover: () => void };

    api.showPopover();
    expect(panel.hasAttribute('popover-open')).toBe(true);

    api.hidePopover();
    expect(panel.hasAttribute('popover-open')).toBe(false);
  });

  it('makes matches(":popover-open") answer from open state', () => {
    uninstall = installPopoverPolyfill();

    const panel = popover();
    const api = panel as HTMLElement & { showPopover: () => void; hidePopover: () => void };

    // Without this, the idiomatic component guard `if (panel.matches(':popover-open'))` is
    // permanently false and hidePopover becomes unreachable from component code.
    expect(panel.matches(':popover-open')).toBe(false);

    api.showPopover();
    expect(panel.matches(':popover-open')).toBe(true);

    api.hidePopover();
    expect(panel.matches(':popover-open')).toBe(false);
  });

  it('leaves other selectors to the native engine', () => {
    uninstall = installPopoverPolyfill();

    const panel = popover();

    expect(panel.matches('div[popover]')).toBe(true);
    expect(panel.matches('.nope')).toBe(false);
  });

  it('keeps an open popover visible so its contents stay focusable', () => {
    uninstall = installPopoverPolyfill();

    const panel = popover();
    const row = panel.querySelector<HTMLElement>('.row')!;
    const view = panel.ownerDocument.defaultView!;

    // jsdom's UA sheet pins every [popover] to display: none (nothing matches :popover-open to lift
    // it), and its focus algorithm refuses anything under a display: none ancestor.
    expect(view.getComputedStyle(panel).display).toBe('none');
    row.focus();
    expect(document.activeElement).not.toBe(row);

    (panel as HTMLElement & { showPopover: () => void }).showPopover();

    expect(view.getComputedStyle(panel).display).toBe('block');
    row.focus();
    expect(document.activeElement).toBe(row);
  });

  it('restores the pre-open display when hidden', () => {
    uninstall = installPopoverPolyfill();

    const panel = popover();
    const api = panel as HTMLElement & { showPopover: () => void; hidePopover: () => void };
    const view = panel.ownerDocument.defaultView!;

    api.showPopover();
    api.hidePopover();

    expect(panel.style.display).toBe('');
    expect(view.getComputedStyle(panel).display).toBe('none');
  });

  it('does not overwrite an author-chosen display', () => {
    uninstall = installPopoverPolyfill();

    const panel = popover();

    panel.style.display = 'grid';

    const api = panel as HTMLElement & { showPopover: () => void; hidePopover: () => void };

    api.showPopover();
    expect(panel.style.display).toBe('grid');

    api.hidePopover();
    expect(panel.style.display).toBe('grid');
  });

  it('toggles and reports the resulting state', () => {
    uninstall = installPopoverPolyfill();

    const panel = popover();
    const api = panel as HTMLElement & { togglePopover: (force?: boolean) => boolean };

    expect(api.togglePopover()).toBe(true);
    expect(api.togglePopover()).toBe(false);
    expect(api.togglePopover(true)).toBe(true);
    expect(api.togglePopover(true)).toBe(true);
    expect(api.togglePopover()).toBe(false);
  });

  it('throws for an element without a popover attribute', () => {
    uninstall = installPopoverPolyfill();

    const plain = document.createElement('div');

    document.body.append(plain);

    expect(() => (plain as HTMLElement & { showPopover: () => void }).showPopover()).toThrow(/popover/);
  });

  it('is idempotent and restores the environment on uninstall', () => {
    const first = installPopoverPolyfill();
    const second = installPopoverPolyfill();

    const panel = popover();

    expect(typeof (panel as HTMLElement & { showPopover?: () => void }).showPopover).toBe('function');

    first();
    second();

    expect((panel as HTMLElement & { showPopover?: () => void }).showPopover).toBeUndefined();
    expect((panel as HTMLElement & { hidePopover?: () => void }).hidePopover).toBeUndefined();
    expect((panel as HTMLElement & { togglePopover?: () => void }).togglePopover).toBeUndefined();
    expect(panel.matches(':popover-open')).toBe(false);
  });
});
