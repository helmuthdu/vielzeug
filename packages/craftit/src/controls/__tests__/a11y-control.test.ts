import { createA11yControl } from '../a11y-control';
/**
 * Tests for createA11yControl composable from the Craftit controls surface
 */
import { currentRuntime, html, signal } from '../../index';
import { mount } from '../../testing';

describe('createA11yControl', () => {
  it('sets the ARIA role on the host element during setup', async () => {
    const { element } = await mount(() => {
      const host = currentRuntime().el;

      createA11yControl(host, { role: 'checkbox' });

      return html`<div></div>`;
    });

    expect(element.getAttribute('role')).toBe('checkbox');
  });

  it('returns the configured labelId and helperId as stable strings', async () => {
    let handle!: ReturnType<typeof createA11yControl>;

    await mount(() => {
      const host = currentRuntime().el;

      handle = createA11yControl(host, {
        helperId: 'my-helper',
        labelId: 'my-label',
        role: 'switch',
      });

      return html`<div></div>`;
    });

    expect(handle.labelId).toBe('my-label');
    expect(handle.helperId).toBe('my-helper');
  });

  it('auto-generates unique labelId and helperId when none are configured', async () => {
    let handleA!: ReturnType<typeof createA11yControl>;
    let handleB!: ReturnType<typeof createA11yControl>;

    await mount(() => {
      const host = currentRuntime().el;

      handleA = createA11yControl(host, { role: 'radio' });

      return html`<div></div>`;
    });
    await mount(() => {
      const host = currentRuntime().el;

      handleB = createA11yControl(host, { role: 'radio' });

      return html`<div></div>`;
    });

    expect(handleA.labelId).not.toBe(handleB.labelId);
    expect(handleA.helperId).not.toBe(handleB.helperId);
  });

  it('sets aria-checked reactively via the checked getter', async () => {
    const checked = signal<'true' | 'false' | undefined>('false');

    const { act, element } = await mount(() => {
      const host = currentRuntime().el;

      createA11yControl(host, { checked: () => checked.value, role: 'checkbox' });

      return html`<div></div>`;
    });

    expect(element.getAttribute('aria-checked')).toBe('false');

    await act(() => {
      checked.value = 'true';
    });

    expect(element.getAttribute('aria-checked')).toBe('true');

    await act(() => {
      checked.value = undefined;
    });

    expect(element.hasAttribute('aria-checked')).toBe(false);
  });

  it('sets aria-invalid reactively via the invalid getter', async () => {
    const invalid = signal(false);

    const { act, element } = await mount(() => {
      const host = currentRuntime().el;

      createA11yControl(host, { invalid: () => invalid.value, role: 'textbox' });

      return html`<div></div>`;
    });

    expect(element.getAttribute('aria-invalid')).toBe('false');

    await act(() => {
      invalid.value = true;
    });

    expect(element.getAttribute('aria-invalid')).toBe('true');
  });

  it('adds aria-describedby and populates the helper live-region when helper text is set', async () => {
    const helperMsg = signal<string | undefined>(undefined);

    const { act, element } = await mount(() => {
      const host = currentRuntime().el;

      createA11yControl(host, {
        helperId: 'desc-test',
        helperText: () => helperMsg.value,
        role: 'textbox',
      });

      // The composable queries [data-a11y-helper] from the shadow root
      return html`<div data-a11y-helper hidden></div>`;
    });

    // Before helper text is set, no aria-describedby
    expect(element.hasAttribute('aria-describedby')).toBe(false);

    await act(() => {
      helperMsg.value = 'Enter a valid email address';
    });

    expect(element.getAttribute('aria-describedby')).toBe('desc-test');
    expect(element.shadowRoot?.querySelector('[data-a11y-helper]')?.id).toBe('desc-test');
  });

  it('reacts to label content being added and removed after mount', async () => {
    const { act, element } = await mount(() => {
      const host = currentRuntime().el;

      createA11yControl(host, {
        labelId: 'dynamic-label',
        role: 'checkbox',
      });

      return html`<span data-a11y-label><slot></slot></span>`;
    });

    expect(element.hasAttribute('aria-labelledby')).toBe(false);

    await act(() => {
      element.textContent = 'Accept terms';
    });

    expect(element.getAttribute('aria-labelledby')).toBe('dynamic-label');

    await act(() => {
      element.textContent = '';
    });

    expect(element.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('wires aria-labelledby on initial mount when slotted label text already exists', async () => {
    const { element } = await mount(
      () => {
        const host = currentRuntime().el;

        createA11yControl(host, {
          labelId: 'initial-label',
          role: 'checkbox',
        });

        return html`<span data-a11y-label><slot></slot></span>`;
      },
      { html: 'Accept terms' },
    );

    expect(element.getAttribute('aria-labelledby')).toBe('initial-label');
    expect(element.shadowRoot?.getElementById('initial-label')).toBeTruthy();
  });

  it('does not set aria-labelledby when the label marker has no content', async () => {
    const { element } = await mount(() => {
      const host = currentRuntime().el;

      createA11yControl(host, {
        labelId: 'empty-label',
        role: 'switch',
      });

      return html`<span data-a11y-label><slot></slot></span>`;
    });

    expect(element.hasAttribute('aria-labelledby')).toBe(false);
  });
});
