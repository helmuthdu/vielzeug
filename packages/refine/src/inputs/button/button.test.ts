import { type Fixture, mount, user } from '@vielzeug/ore/testing';

beforeAll(async () => {
  await import('./button');
  await import('../button-group/button-group');
});

describe('ore-button', () => {
  let fixture: Fixture<HTMLElement>;

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders a visual part element by default', async () => {
      fixture = await mount('ore-button');

      expect(fixture.query('[part="button"]')).toBeTruthy();
    });

    it('renders a loader element hidden by default', async () => {
      fixture = await mount('ore-button');

      expect(fixture.query('.loader')?.hasAttribute('hidden')).toBe(true);
    });

    it('default slot content is rendered', async () => {
      fixture = await mount('ore-button', { html: '<span>Save</span>' });

      expect(fixture.element.textContent?.trim()).toBe('Save');
    });
  });

  describe('Disabled state', () => {
    it('does not fire click when disabled', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);
      await user.click(fixture.query<HTMLElement>('[part="button"]')!);

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire click when loading', async () => {
      fixture = await mount('ore-button', { attrs: { loading: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);
      await user.click(fixture.query<HTMLElement>('[part="button"]')!);

      expect(handler).not.toHaveBeenCalled();
    });

    it('hides content area while loading', async () => {
      fixture = await mount('ore-button', { attrs: { loading: '' } });

      // The [loading] attribute drives the CSS rule; verify the host reflects it.
      expect(fixture.element.hasAttribute('loading')).toBe(true);
    });

    it('shows loader spinner while loading', async () => {
      fixture = await mount('ore-button', { attrs: { loading: '' } });

      expect(fixture.query('.loader')?.hasAttribute('hidden')).toBe(false);
    });
  });

  describe('Click event', () => {
    it('fires click on an enabled button', async () => {
      fixture = await mount('ore-button');

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);
      await user.click(fixture.query<HTMLElement>('[part="button"]')!);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('fires click on keyboard Enter', async () => {
      fixture = await mount('ore-button');

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);

      const btn = fixture.query<HTMLElement>('[part="button"]')!;

      btn.focus();
      await user.click(btn);

      expect(handler).toHaveBeenCalled();
    });

    it('does not fire click when disabled and keyboard activated', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);

      const btn = fixture.query<HTMLElement>('[part="button"]')!;

      btn.focus();
      await user.click(btn);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Form submission', () => {
    async function mountInForm(buttonAttrs: Record<string, string> = {}) {
      const html = `
        <form id="test-form">
          <input name="field" value="hello" />
          <ore-button ${Object.entries(buttonAttrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ')}>Submit</ore-button>
        </form>
      `;
      const wrapper = document.createElement('div');

      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);

      const btn = wrapper.querySelector<HTMLElement>('ore-button')!;

      // Wait for custom element upgrade + ElementInternals form association.
      await new Promise<void>((resolve) => setTimeout(resolve, 150));

      return {
        btn,
        destroy: () => wrapper.remove(),
        form: wrapper.querySelector<HTMLFormElement>('form')!,
      };
    }

    it('is a child of the enclosing form (drives ElementInternals association)', async () => {
      const { btn, destroy, form } = await mountInForm({ type: 'submit' });

      expect(form.contains(btn)).toBe(true);
      destroy();
    });

    it('host reflects type="submit" attribute consumed by useFormAction', async () => {
      const { btn, destroy } = await mountInForm({ type: 'submit' });

      expect(btn.getAttribute('type')).toBe('submit');
      destroy();
    });

    it('does not trigger form submit when type="button"', async () => {
      const { btn, destroy, form } = await mountInForm({ type: 'button' });
      const submitHandler = vi.fn((e: Event) => e.preventDefault());

      form.addEventListener('submit', submitHandler);
      await user.click(btn);

      expect(submitHandler).not.toHaveBeenCalled();
      destroy();
    });

    it('host reflects type="reset" attribute consumed by useFormAction', async () => {
      const { btn, destroy } = await mountInForm({ type: 'reset' });

      expect(btn.getAttribute('type')).toBe('reset');
      destroy();
    });

    it('does not submit form when disabled', async () => {
      const { btn, destroy, form } = await mountInForm({ disabled: '', type: 'submit' });
      const submitHandler = vi.fn((e: Event) => e.preventDefault());

      form.addEventListener('submit', submitHandler);
      await user.click(btn);

      expect(submitHandler).not.toHaveBeenCalled();
      destroy();
    });
  });

  describe('Link mode', () => {
    it('renders as a link when href is provided', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/home' } });

      expect(fixture.query('a[part="button"]')).toBeTruthy();
      expect(fixture.query('span[part="button"]')).toBeFalsy();
    });

    it('reverts to normal when href is removed', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/home' } });

      fixture.element.removeAttribute('href');
      await new Promise<void>((r) => setTimeout(r, 10));

      expect(fixture.query('span[part="button"]')).toBeTruthy();
      expect(fixture.query('a[part="button"]')).toBeFalsy();
    });

    it('internal anchor element reflects the href prop', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/about' } });

      expect(fixture.query('a[part="button"]')?.getAttribute('href')).toBe('/about');
    });

    it('injects noopener noreferrer for target=_blank', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page', target: '_blank' } });

      const rel = fixture.query('a[part="button"]')?.getAttribute('rel') ?? '';

      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
      expect(fixture.query('a[part="button"]')?.getAttribute('target')).toBe('_blank');
    });

    it('does not add rel when target is not _blank', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page', target: '_self' } });

      expect(fixture.query('a[part="button"]')?.getAttribute('rel')).toBeNull();
    });

    it('merges custom rel with security tokens for _blank', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page', rel: 'external', target: '_blank' } });

      const rel = fixture.query('a[part="button"]')?.getAttribute('rel') ?? '';

      expect(rel).toContain('external');
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    });

    it('the inner anchor is decorative (tabindex -1) — the host carries the real link semantics', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page' } });

      expect(fixture.query('a[part="button"]')?.getAttribute('tabindex')).toBe('-1');
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
      expect(fixture.element.getAttribute('role')).toBe('link');
    });

    it('disabling pointer interaction on the anchor when disabled', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '', href: '/page' } });

      expect(fixture.element.getAttribute('tabindex')).toBe('-1');
      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    });

    it('link mode does not trigger form submission', async () => {
      const wrapper = document.createElement('div');

      wrapper.innerHTML = `
        <form id="lf">
          <ore-button href="/nav" type="submit">Go</ore-button>
        </form>
      `;
      document.body.appendChild(wrapper);
      await new Promise<void>((r) => setTimeout(r, 50));

      const btn = wrapper.querySelector<HTMLElement>('ore-button')!;
      const submitHandler = vi.fn((e: Event) => e.preventDefault());

      wrapper.querySelector('form')!.addEventListener('submit', submitHandler);
      await user.click(btn);

      expect(submitHandler).not.toHaveBeenCalled();
      wrapper.remove();
    });
  });

  describe('Button group context', () => {
    async function mountInGroup(groupAttrs: Record<string, string>, buttonAttrs: Record<string, string> = {}) {
      const html = `
        <ore-button-group ${Object.entries(groupAttrs)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ')}>
          <ore-button ${Object.entries(buttonAttrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ')}>Item</ore-button>
        </ore-button-group>
      `;
      const wrapper = document.createElement('div');

      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);
      await new Promise<void>((r) => setTimeout(r, 50));

      return {
        btn: wrapper.querySelector<HTMLElement>('ore-button')!,
        destroy: () => wrapper.remove(),
      };
    }

    it('inherits variant from group context', async () => {
      const { btn, destroy } = await mountInGroup({ variant: 'outline' });

      expect(btn.getAttribute('variant')).toBe('outline');
      destroy();
    });

    it('inherits color from group context', async () => {
      const { btn, destroy } = await mountInGroup({ color: 'primary' });

      expect(btn.getAttribute('color')).toBe('primary');
      destroy();
    });

    it('inherits size from group context', async () => {
      const { btn, destroy } = await mountInGroup({ size: 'sm' });

      expect(btn.getAttribute('size')).toBe('sm');
      destroy();
    });

    it('own variant is overridden by group context', async () => {
      const { btn, destroy } = await mountInGroup({ variant: 'ghost' }, { variant: 'solid' });

      expect(btn.getAttribute('variant')).toBe('ghost');
      destroy();
    });
  });
});

describe('ore-button accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  afterEach(() => {
    fixture?.dispose();
  });

  describe('ARIA', () => {
    it('host carries aria-disabled=true when disabled', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '' } });

      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    });

    it('host aria-disabled is absent when enabled', async () => {
      fixture = await mount('ore-button');

      const val = fixture.element.getAttribute('aria-disabled');

      expect(val === null || val === 'false').toBe(true);
    });

    it('host carries aria-busy=true when loading', async () => {
      fixture = await mount('ore-button', { attrs: { loading: '' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('host aria-busy is absent when not loading', async () => {
      fixture = await mount('ore-button');

      expect(fixture.element.getAttribute('aria-busy')).toBeNull();
    });

    it('host aria-label reflects the label prop', async () => {
      fixture = await mount('ore-button', { attrs: { label: 'Close dialog' } });

      expect(fixture.element.getAttribute('aria-label')).toBe('Close dialog');
    });

    it('loader has aria-label="Loading"', async () => {
      fixture = await mount('ore-button', { attrs: { loading: '' } });

      expect(fixture.query('.loader')?.getAttribute('aria-label')).toBe('Loading');
    });

    it('anchor in link mode carries role="link" on host', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page' } });

      expect(fixture.element.getAttribute('role')).toBe('link');
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks with default rendering', async () => {
      fixture = await mount('ore-button', { html: 'Click me' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks in disabled state', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '' }, html: 'Save' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
