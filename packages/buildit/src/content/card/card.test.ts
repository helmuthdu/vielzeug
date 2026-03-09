import { type Fixture, mount, user } from '@vielzeug/craftit/test';

describe('bit-card', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./card');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('renders card element', async () => {
    fixture = await mount('bit-card');

    expect(fixture.element).toBeTruthy();
  });

  it('keeps non-interactive card out of tab flow', async () => {
    fixture = await mount('bit-card');

    expect(fixture.element.getAttribute('role')).toBeNull();
    expect(fixture.element.getAttribute('tabindex')).toBeNull();
  });

  it('adds button semantics when interactive', async () => {
    fixture = await mount('bit-card', { attrs: { interactive: '' } });

    expect(fixture.element.getAttribute('role')).toBe('button');
    expect(fixture.element.getAttribute('tabindex')).toBe('0');
  });

  it('sets aria-disabled and tabindex -1 when interactive card is disabled', async () => {
    fixture = await mount('bit-card', { attrs: { disabled: '', interactive: '' } });

    expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    expect(fixture.element.getAttribute('tabindex')).toBe('-1');
  });

  it('reflects loading state to aria-busy', async () => {
    fixture = await mount('bit-card', { attrs: { loading: '' } });
    expect(fixture.element.getAttribute('aria-busy')).toBe('true');

    fixture.destroy();
    fixture = await mount('bit-card');
    expect(fixture.element.getAttribute('aria-busy')).toBe('false');
  });

  it('emits activate with pointer trigger on click', async () => {
    fixture = await mount('bit-card', { attrs: { interactive: '' } });
    const handler = vi.fn();
    fixture.element.addEventListener('activate', handler);

    await user.click(fixture.element);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.trigger).toBe('pointer');
    expect(handler.mock.calls[0][0].detail.originalEvent).toBeInstanceOf(MouseEvent);
  });

  it('emits activate with keyboard trigger on Enter', async () => {
    fixture = await mount('bit-card', { attrs: { interactive: '' } });
    const handler = vi.fn();
    fixture.element.addEventListener('activate', handler);

    fixture.element.focus();
    await user.press(fixture.element, 'Enter');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.trigger).toBe('keyboard');
    expect(handler.mock.calls[0][0].detail.originalEvent).toBeInstanceOf(KeyboardEvent);
  });

  it('emits activate with keyboard trigger on Space', async () => {
    fixture = await mount('bit-card', { attrs: { interactive: '' } });
    const handler = vi.fn();
    fixture.element.addEventListener('activate', handler);

    fixture.element.focus();
    await user.press(fixture.element, ' ');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.trigger).toBe('keyboard');
  });

  it('does not emit activate when disabled', async () => {
    fixture = await mount('bit-card', { attrs: { disabled: '', interactive: '' } });
    const handler = vi.fn();
    fixture.element.addEventListener('activate', handler);

    await user.click(fixture.element);
    fixture.element.focus();
    await user.press(fixture.element, 'Enter');

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not emit activate when clicking nested interactive content', async () => {
    fixture = await mount('bit-card', {
      attrs: { interactive: '' },
      html: '<button slot="actions" id="inner-action">Inner action</button>',
    });
    const handler = vi.fn();
    fixture.element.addEventListener('activate', handler);

    const button = fixture.element.querySelector('#inner-action') as HTMLButtonElement;
    await user.click(button);

    expect(handler).not.toHaveBeenCalled();
  });

  it('hides empty named sections and shows them when slots are populated', async () => {
    fixture = await mount('bit-card', {
      html: '<span slot="header">Title</span><span slot="footer">Footer</span>',
    });
    await Promise.resolve();

    const root = fixture.element.shadowRoot;
    const media = root?.querySelector('.card-media');
    const header = root?.querySelector('.card-header');
    const content = root?.querySelector('.card-content');
    const footer = root?.querySelector('.card-footer');
    const actions = root?.querySelector('.card-actions');

    expect(media?.hasAttribute('hidden')).toBe(true);
    expect(header?.hasAttribute('hidden')).toBe(false);
    expect(content?.hasAttribute('hidden')).toBe(true);
    expect(footer?.hasAttribute('hidden')).toBe(false);
    expect(actions?.hasAttribute('hidden')).toBe(true);
  });

  it('remains interactive with arbitrary visual attributes', async () => {
    fixture = await mount('bit-card', {
      attrs: {
        color: 'danger',
        interactive: '',
        orientation: 'vertical',
        padding: '2xl',
        variant: 'outlined',
      },
    });

    const handler = vi.fn();
    fixture.element.addEventListener('activate', handler);
    await user.click(fixture.element);

    expect(fixture.element.getAttribute('color')).toBe('danger');
    expect(fixture.element.getAttribute('padding')).toBe('2xl');
    expect(fixture.element.getAttribute('variant')).toBe('outlined');
    expect(fixture.element.getAttribute('orientation')).toBe('vertical');
    expect(handler).toHaveBeenCalledTimes(1);

    fixture.destroy();
    fixture = await mount('bit-card', {
      attrs: {
        color: 'primary',
        interactive: '',
        orientation: 'horizontal',
        padding: 'lg',
        variant: 'glass',
      },
    });

    expect(fixture.element.getAttribute('color')).toBe('primary');
    expect(fixture.element.getAttribute('padding')).toBe('lg');
    expect(fixture.element.getAttribute('variant')).toBe('glass');
    expect(fixture.element.getAttribute('orientation')).toBe('horizontal');
  });
});
