import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { attachForgeDevtools } from '../devtools';
import { createForm } from '../form';

describe('attachForgeDevtools', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs nothing on attach (baseline only, no spurious "changed from undefined" noise)', () => {
    const form = createForm({ defaultValues: { email: '' } });

    attachForgeDevtools(form);

    expect(consoleSpy).not.toHaveBeenCalled();

    form.dispose();
  });

  it('logs a distinct line when a field value changes', () => {
    const form = createForm({ defaultValues: { email: '' } });

    attachForgeDevtools(form);
    form.set('email', 'a@b.com');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('field "email" value:'), '', '→', 'a@b.com');

    form.dispose();
  });

  it('logs a distinct line when a field error changes', () => {
    const form = createForm({ defaultValues: { email: '' } });

    attachForgeDevtools(form);
    form.setError('email', 'Required');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('field "email" error:'),
      undefined,
      '→',
      'Required',
    );

    form.dispose();
  });

  it('logs a distinct line when a field touched status changes', () => {
    const form = createForm({ defaultValues: { email: '' } });

    attachForgeDevtools(form);
    form.touch('email');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('field "email" touched:'), true);

    form.dispose();
  });

  it('logs a distinct line when a field dirty status changes', () => {
    const form = createForm({ defaultValues: { email: '' } });

    attachForgeDevtools(form);
    form.set('email', 'a@b.com');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('field "email" dirty:'), true);

    form.dispose();
  });

  it('logs submit start and end via the isSubmitting edge', async () => {
    const form = createForm({ defaultValues: { email: 'a@b.com' } });

    attachForgeDevtools(form);
    await form.submit(() => {});

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('submit started (submitCount=1)'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('submit ended (submitCount=1)'));

    form.dispose();
  });

  it('logs the isLoading edge for async defaultValues', async () => {
    const form = createForm({ defaultValues: () => Promise.resolve({ email: 'loaded@b.com' }) });

    attachForgeDevtools(form);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('isLoading:'), false);

    form.dispose();
  });

  it('includes a custom label in the log prefix', () => {
    const form = createForm({ defaultValues: { email: '' } });

    attachForgeDevtools(form, { label: 'signup' });
    form.set('email', 'a@b.com');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[forge:devtools:signup]'),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    form.dispose();
  });

  it('defaults the label to "form" when not provided', () => {
    const form = createForm({ defaultValues: { email: '' } });

    attachForgeDevtools(form);
    form.set('email', 'a@b.com');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[forge:devtools:form]'),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    form.dispose();
  });

  it('tears down cleanly when the form is disposed without calling the returned detach first', () => {
    const form = createForm({ defaultValues: { email: '' } });

    attachForgeDevtools(form);
    form.set('email', 'a@b.com');
    consoleSpy.mockClear();

    // form.dispose() alone (never the detach() returned by attachForgeDevtools) must clean up
    // the underlying form.subscribe() without throwing or leaking a dangling subscription.
    expect(() => form.dispose()).not.toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();

    // Further mutation attempts on a disposed form throw before any subscriber would run —
    // confirms no observer effects from the stale devtools subscription.
    expect(() => form.set('email', 'b@c.com')).toThrow('Cannot modify a disposed form');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('stops logging once the returned unsubscribe is called', () => {
    const form = createForm({ defaultValues: { email: '' } });

    const detach = attachForgeDevtools(form);

    detach();
    form.set('email', 'a@b.com');

    expect(consoleSpy).not.toHaveBeenCalled();

    form.dispose();
  });

  it('works on a scoped sub-form using relative field paths', () => {
    const form = createForm({ defaultValues: { address: { city: '' } } });
    const scoped = form.scope('address');

    attachForgeDevtools(scoped);
    scoped.set('city', 'Berlin');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('field "city" value:'), '', '→', 'Berlin');

    form.dispose();
  });

  it('is silent in production builds (__FORGE_PROD__ set)', async () => {
    vi.resetModules();
    (globalThis as { __FORGE_PROD__?: boolean }).__FORGE_PROD__ = true;

    try {
      const { createForm: createFormProd } = await import('../form');
      const { attachForgeDevtools: attachForgeDevtoolsProd } = await import('../devtools');

      const form = createFormProd({ defaultValues: { email: '' } });
      const detach = attachForgeDevtoolsProd(form);

      form.set('email', 'a@b.com');

      expect(consoleSpy).not.toHaveBeenCalled();

      detach();
      form.dispose();
    } finally {
      delete (globalThis as { __FORGE_PROD__?: boolean }).__FORGE_PROD__;
      vi.resetModules();
    }
  });
});
