/**
 * Tests for createA11yControl composable from the Craftit controls surface
 */
import { html, signal } from '@vielzeug/craftit';
import { mount } from '@vielzeug/craftit/testing';
import { createA11yControl } from '../a11y-control';

describe('createA11yControl', () => {
  it('sets the ARIA role on the host element during setup', async () => {
    const { element } = await mount(() => {
      createA11yControl({ getLabelEl: () => null, getHelperEl: () => null, role: 'checkbox' });

      return () => html`<div></div>`;
    });

    expect(element.getAttribute('role')).toBe('checkbox');
  });

  it('returns stable labelId and helperId strings', async () => {
    let handle!: ReturnType<typeof createA11yControl>;

    await mount(() => {
      handle = createA11yControl({
        getLabelEl: () => null,
        getHelperEl: () => null,
        role: 'switch',
      });

      return () => html`<div></div>`;
    });

    expect(typeof handle.labelId).toBe('string');
    expect(handle.labelId.length).toBeGreaterThan(0);
    expect(typeof handle.helperId).toBe('string');
    expect(handle.helperId.length).toBeGreaterThan(0);
  });

  it('auto-generates unique labelId and helperId for each control', async () => {
    let handleA!: ReturnType<typeof createA11yControl>;
    let handleB!: ReturnType<typeof createA11yControl>;

    await mount(() => {
      handleA = createA11yControl({ getLabelEl: () => null, getHelperEl: () => null, role: 'radio' });

      return () => html`<div></div>`;
    });
    await mount(() => {
      handleB = createA11yControl({ getLabelEl: () => null, getHelperEl: () => null, role: 'radio' });

      return () => html`<div></div>`;
    });

    expect(handleA.labelId).not.toBe(handleB.labelId);
    expect(handleA.helperId).not.toBe(handleB.helperId);
  });

  it('sets aria-checked reactively via the checked getter', async () => {
    const checked = signal<'true' | 'false' | undefined>('false');

    const { act, element } = await mount(() => {
      createA11yControl({ getLabelEl: () => null, getHelperEl: () => null, checked: () => checked.value, role: 'checkbox' });

      return () => html`<div></div>`;
    });

    expect(element.getAttribute('aria-checked')).toBe('false');

    await act(() => { checked.value = 'true'; });

    expect(element.getAttribute('aria-checked')).toBe('true');

    await act(() => { checked.value = undefined; });

    expect(element.hasAttribute('aria-checked')).toBe(false);
  });

  it('sets aria-invalid reactively via the invalid getter', async () => {
    const invalid = signal(false);

    const { act, element } = await mount(() => {
      createA11yControl({ getLabelEl: () => null, getHelperEl: () => null, invalid: () => invalid.value, role: 'textbox' });

      return () => html`<div></div>`;
    });

    expect(element.getAttribute('aria-invalid')).toBe('false');

    await act(() => { invalid.value = true; });

    expect(element.getAttribute('aria-invalid')).toBe('true');
  });

  it('adds aria-describedby and populates the helper element when helper text is set', async () => {
    const helperMsg = signal<string | undefined>(undefined);
    const refs = { helper: null as HTMLElement | null };

    const { act, element } = await mount(() => {
      createA11yControl({
        getLabelEl: () => null,
        getHelperEl: () => refs.helper,
        helperText: () => helperMsg.value,
        role: 'textbox',
      });

      return () => html`<div ref=${(el: HTMLElement | null) => { refs.helper = el; }}></div>`;
    });

    expect(element.hasAttribute('aria-describedby')).toBe(false);

    await act(() => { helperMsg.value = 'Enter a valid email address'; });

    expect(element.hasAttribute('aria-describedby')).toBe(true);
    expect(refs.helper?.textContent).toBe('Enter a valid email address');
  });

  it('sets the id on the label element equal to the handle labelId', async () => {
    const refs = { label: null as HTMLElement | null };
    let handle!: ReturnType<typeof createA11yControl>;

    await mount(() => {
      handle = createA11yControl({
        getLabelEl: () => refs.label,
        getHelperEl: () => null,
        role: 'checkbox',
      });

      return () => html`<span ref=${(el: HTMLElement | null) => { refs.label = el; }}></span>`;
    });

    expect(refs.label?.id).toBe(handle.labelId);
  });

  it('sets the id on the helper element equal to the handle helperId when helperText is set', async () => {
    const refs = { helper: null as HTMLElement | null };
    let handle!: ReturnType<typeof createA11yControl>;

    const helperMsg = signal<string | undefined>('Some help text');

    await mount(() => {
      handle = createA11yControl({
        getLabelEl: () => null,
        getHelperEl: () => refs.helper,
        helperText: () => helperMsg.value,
        role: 'textbox',
      });

      return () => html`<span ref=${(el: HTMLElement | null) => { refs.helper = el; }}></span>`;
    });

    expect(refs.helper?.id).toBe(handle.helperId);
  });
});
