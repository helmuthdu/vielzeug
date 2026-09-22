import { delay, eventually, fireClick } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

import { createToastService } from './toast';

const completeExit = async (fixture: Fixture<HTMLElement>, flush: () => Promise<void>) => {
  fixture
    .query<HTMLElement>('.toast-inner.exiting')
    ?.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true }));
  await flush();
};

const getCloseButton = (fixture: Fixture<HTMLElement>): HTMLElement | null =>
  fixture.query<HTMLElement>('ore-alert')?.shadowRoot?.querySelector<HTMLElement>('[part="close"]') ?? null;

describe('ore-toast', () => {
  let fixture: Fixture<HTMLElement>;
  let service: ReturnType<typeof createToastService>;

  beforeAll(async () => {
    await import('../alert/alert');
    await import('./toast');
  });

  beforeEach(async () => {
    fixture = await mount('ore-toast');
    service = createToastService(fixture.element.parentElement!);
  });

  afterEach(() => {
    service?.dispose();
    fixture?.dispose();
  });

  it('is a declarative host without public mutation methods', () => {
    expect('add' in fixture.element).toBe(false);
    expect('clear' in fixture.element).toBe(false);
    expect('dismiss' in fixture.element).toBe(false);
    expect('update' in fixture.element).toBe(false);
  });

  it('renders the service store in polite and assertive live regions', async () => {
    service.add({ duration: 0, message: 'Saved' });
    service.add({ color: 'error', duration: 0, message: 'Failed' });
    await fixture.flush();

    expect(fixture.query('[aria-live="polite"] ore-alert')?.textContent).toContain('Saved');
    expect(fixture.query('[aria-live="assertive"] ore-alert')?.textContent).toContain('Failed');
  });

  it('renders configured host attributes declaratively', () => {
    expect(fixture.element.getAttribute('position')).toBe('bottom-right');
    expect(fixture.element.getAttribute('max')).toBe('5');
  });

  it('dismisses from the service after the exit transition', async () => {
    const dismissed = vi.fn();
    const id = service.add({ duration: 0, message: 'Dismiss me', onDismiss: dismissed });

    await fixture.flush();

    service.dismiss(id);
    await fixture.flush();
    expect(fixture.query('.toast-inner.exiting')).toBeTruthy();

    await completeExit(fixture, fixture.flush);

    expect(fixture.query(`[data-toast-id="${id}"]`)).toBeNull();
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('allows the alert close button to dismiss through its bound store', async () => {
    service.add({ duration: 0, message: 'Closable' });
    await fixture.flush();

    fireClick(getCloseButton(fixture)!);
    await fixture.flush();
    await completeExit(fixture, fixture.flush);

    expect(fixture.query('ore-alert')).toBeNull();
  });

  it('evicts the oldest notification when the scoped service max is reached', async () => {
    service.dispose();

    fixture.dispose();

    fixture = await mount('ore-toast', { attrs: { max: '1' } });

    service = createToastService(fixture.element.parentElement!);

    const first = service.add({ duration: 0, message: 'First' });

    service.add({ duration: 0, message: 'Second' });
    await fixture.flush();

    expect(fixture.query(`[data-toast-id="${first}"] .toast-inner.exiting`)).toBeTruthy();
  });

  it('pauses service-owned timers on hover and resumes them afterward', async () => {
    service.add({ duration: 40, message: 'Read me' });

    await fixture.flush();

    const container = fixture.element.shadowRoot?.querySelector('.toast-container')!;

    container.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));

    await delay(80);

    expect(fixture.query('ore-alert')).toBeTruthy();

    container.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));

    await delay(80);

    await completeExit(fixture, fixture.flush);
    expect(fixture.query('ore-alert')).toBeNull();
  });

  it('dismisses a toast after a committed swipe', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const id = service.add({ duration: 0, message: 'Swipe me' });

    await fixture.flush();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const wrapper = fixture.query<HTMLElement>(`[data-toast-id="${id}"]`)!;

    const inner = wrapper.querySelector<HTMLElement>('.toast-inner')!;

    const swipeEventInit = {
      bubbles: true,
      composed: true,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    } as const;

    wrapper.dispatchEvent(new PointerEvent('pointerdown', { ...swipeEventInit, clientX: 0 }));
    wrapper.dispatchEvent(new PointerEvent('pointermove', { ...swipeEventInit, clientX: 300 }));
    wrapper.dispatchEvent(new PointerEvent('pointerup', { ...swipeEventInit, clientX: 300 }));
    inner.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true, propertyName: 'transform' }));
    await fixture.flush();

    expect(fixture.query(`[data-toast-id="${id}"]`)).toBeNull();

    window.matchMedia = originalMatchMedia;
  });

  it('does not start a swipe from an action button', async () => {
    const onAction = vi.fn();
    const id = service.add({
      actions: [{ label: 'Undo', onClick: onAction }],
      duration: 0,
      message: 'Actionable',
    });

    await fixture.flush();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const wrapper = fixture.query<HTMLElement>(`[data-toast-id="${id}"]`)!;
    const inner = wrapper.querySelector<HTMLElement>('.toast-inner')!;
    const action = wrapper.querySelector<HTMLElement>('ore-button')!;
    const pointerInit = {
      bubbles: true,
      composed: true,
      isPrimary: true,
      pointerId: 2,
      pointerType: 'touch',
    } as const;

    action.dispatchEvent(new PointerEvent('pointerdown', { ...pointerInit, clientX: 0 }));
    action.dispatchEvent(new PointerEvent('pointermove', { ...pointerInit, clientX: 40 }));
    action.dispatchEvent(new PointerEvent('pointerup', { ...pointerInit, clientX: 40 }));

    expect(inner.style.transform).toBe('');

    action.click();
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('passes axe checks', async () => {
    const results = await axeCheck(fixture.element);

    expect(results.violations).toHaveLength(0);
  });

  it('keeps the same DOM nodes across timer pauses and updates', async () => {
    const id = service.add({ actions: [{ label: 'Undo' }], duration: 5000, message: 'Saved' });

    await fixture.flush();

    const wrapper = fixture.query<HTMLElement>(`[data-toast-id="${id}"]`)!;
    const alert = wrapper.querySelector('ore-alert')!;
    const action = wrapper.querySelector('ore-button')!;
    const container = fixture.element.shadowRoot?.querySelector('.toast-container')!;

    container.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    service.update(id, { message: 'Saved twice' });
    await fixture.flush();

    expect(fixture.query(`[data-toast-id="${id}"]`)).toBe(wrapper);
    expect(wrapper.querySelector('ore-alert')).toBe(alert);
    expect(wrapper.querySelector('ore-button')).toBe(action);
    expect(alert.textContent).toContain('Saved twice');
  });

  it('renders the alert as an embedded surface that defers dismissal to the store', async () => {
    const id = service.add({ duration: 0, message: 'Closable' });

    await fixture.flush();

    const alert = fixture.query<HTMLElement>('ore-alert')!;

    expect(alert.hasAttribute('embedded')).toBe(true);
    expect(alert.shadowRoot?.querySelector('[role="status"], [role="alert"]')).toBeNull();

    fireClick(getCloseButton(fixture)!);
    await fixture.flush();

    expect(alert.hasAttribute('dismissed')).toBe(false);
    expect(fixture.query(`[data-toast-id="${id}"] .toast-inner.exiting`)).toBeTruthy();
  });

  it('dismisses the focused notification with Escape', async () => {
    const id = service.add({ duration: 0, message: 'Escape me' });
    const persistent = service.add({ dismissible: false, duration: 0, message: 'Stay' });

    await fixture.flush();

    getCloseButton(fixture)!.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Escape' }),
    );
    fixture
      .query(`[data-toast-id="${persistent}"] ore-alert`)!
      .dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Escape' }));
    await fixture.flush();

    expect(fixture.query(`[data-toast-id="${id}"] .toast-inner.exiting`)).toBeTruthy();
    expect(fixture.query(`[data-toast-id="${persistent}"] .toast-inner.exiting`)).toBeNull();
  });

  it('shows an auto-dismiss progress bar only for timed notifications', async () => {
    const timed = service.add({ duration: 4000, message: 'Timed' });
    const persistent = service.add({ duration: 0, message: 'Persistent' });

    await fixture.flush();

    const progress = fixture.query<HTMLElement>(`[data-toast-id="${timed}"] .toast-progress`);

    expect(progress?.style.getPropertyValue('--_toast-duration')).toBe('4000ms');
    expect(progress?.hidden).toBe(false);
    expect(fixture.query<HTMLElement>(`[data-toast-id="${persistent}"] .toast-progress`)?.hidden).toBe(true);
  });

  it('renders action buttons flat by default and keyed to their label', async () => {
    const id = service.add({
      actions: [{ label: 'Undo' }, { label: 'Open', variant: 'solid' }],
      duration: 0,
      message: 'Done',
    });

    await fixture.flush();

    const buttons = fixture.queryAll<HTMLElement>(`[data-toast-id="${id}"] ore-button`);

    expect(buttons.map((button) => button.getAttribute('variant'))).toEqual(['flat', 'solid']);
  });
});

describe('createToastService', () => {
  let container: HTMLElement;

  beforeAll(async () => {
    await import('../alert/alert');
    await import('./toast');
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('reuses one scoped store and declarative host per root', async () => {
    const fixture = await mount('ore-toast', { container });

    const first = createToastService(container);

    const second = createToastService(container);

    const id = first.add({ duration: 0, message: 'Scoped' });

    await fixture.flush();

    expect(second).toBe(first);
    expect(container.querySelectorAll('ore-toast')).toHaveLength(1);
    expect(fixture.query(`[data-toast-id="${id}"]`)).toBeTruthy();
    fixture.dispose();
  });

  it('isolates services and notifications by scope', async () => {
    const other = document.createElement('div');

    document.body.appendChild(other);

    const fixtureA = await mount('ore-toast', { container });

    const fixtureB = await mount('ore-toast', { container: other });

    const idA = createToastService(container).add({ duration: 0, message: 'A' });

    const idB = createToastService(other).add({ duration: 0, message: 'B' });

    await fixtureA.flush();
    await fixtureB.flush();

    expect(fixtureA.query(`[data-toast-id="${idA}"]`)).toBeTruthy();
    expect(fixtureA.query(`[data-toast-id="${idB}"]`)).toBeNull();
    expect(fixtureB.query(`[data-toast-id="${idB}"]`)).toBeTruthy();
    other.remove();
    fixtureA.dispose();
    fixtureB.dispose();
  });

  it('applies configuration before lazily creating its host', () => {
    const service = createToastService(container);

    service.configure({ max: 3, position: 'top-left' });

    service.add({ duration: 0, message: 'Configured' });

    const host = container.querySelector('ore-toast')!;

    expect(host.getAttribute('max')).toBe('3');
    expect(host.getAttribute('position')).toBe('top-left');
  });

  it('cleans up timers and subscriptions when disposed', async () => {
    const fixture = await mount('ore-toast', { container });

    const service = createToastService(container);

    service.add({ duration: 1000, message: 'Pending' });

    await fixture.flush();

    service.dispose();
    await fixture.flush();

    expect(service.disposed).toBe(true);
    expect(service.disposalSignal.aborted).toBe(true);
    expect(fixture.query('ore-alert')).toBeNull();
    fixture.dispose();
  });
});

describe('toast service shortcuts and promises', () => {
  let fixture: Fixture<HTMLElement>;
  let service: ReturnType<typeof createToastService>;

  beforeAll(async () => {
    await import('../alert/alert');
    await import('./toast');
  });

  beforeEach(async () => {
    fixture = await mount('ore-toast');

    service = createToastService(fixture.element.parentElement!);
  });

  afterEach(() => {
    service?.dispose();
    fixture?.dispose();
  });

  it.each([
    ['success', 'success'],
    ['error', 'error'],
    ['info', 'info'],
    ['warning', 'warning'],
  ] as const)('%s shortcut uses the %s colour', async (shortcut, color) => {
    service[shortcut]('Message', { duration: 0 });
    await fixture.flush();

    expect(fixture.query('ore-alert')?.getAttribute('color')).toBe(color);
  });

  it('updates its loading toast when a promise resolves', async () => {
    const result = service.promise(Promise.resolve('file'), {
      error: 'Failed',
      loading: 'Uploading',
      success: (file) => `Uploaded ${file}`,
    });

    await result;
    await fixture.flush();

    await eventually(() => {
      expect(fixture.query('ore-alert')?.textContent).toContain('Uploaded file');
    });
    expect(fixture.query('ore-alert')?.getAttribute('color')).toBe('success');
  });
});
