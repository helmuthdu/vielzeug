import { type Fixture, mount } from '@vielzeug/craft/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const COPY_BTN_PART = 'command';

async function mountCopyCommand(value = '', attrs: Record<string, string> = {}): Promise<Fixture<HTMLElement>> {
  return mount('sg-copy-command', { attrs: { value, ...attrs } });
}

describe('sg-copy-command', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./copy-command');
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the command text', async () => {
      fixture = await mountCopyCommand('npm install @vielzeug/ripple');

      const code = fixture.element.shadowRoot!.querySelector('[part="command-text"]');

      expect(code?.textContent?.trim()).toBe('npm install @vielzeug/ripple');
    });

    it('shows copy icon by default', async () => {
      fixture = await mountCopyCommand('npm install @vielzeug/ripple');

      const icon = fixture.element.shadowRoot!.querySelector('sg-icon');

      expect(icon?.getAttribute('name')).toBe('copy');
    });

    it('renders wrapper and command parts', async () => {
      fixture = await mountCopyCommand('npx -y @vielzeug/codex');

      const wrapper = fixture.element.shadowRoot!.querySelector('[part="wrapper"]');
      const cmd = fixture.element.shadowRoot!.querySelector(`[part="${COPY_BTN_PART}"]`);

      expect(wrapper).toBeTruthy();
      expect(cmd?.tagName.toLowerCase()).toBe('button');
    });

    it('hides suffix when no suffix slot content', async () => {
      fixture = await mountCopyCommand('npm install @vielzeug/ripple');

      const suffix = fixture.element.shadowRoot!.querySelector('[part="suffix"]');

      expect(suffix?.hasAttribute('hidden')).toBe(true);
    });

    it('shows suffix when suffix slot has content', async () => {
      fixture = await mount('sg-copy-command', {
        attrs: { value: 'npm install' },
        html: '<button slot="suffix">›</button>',
      });

      const suffix = fixture.element.shadowRoot!.querySelector('[part="suffix"]');

      expect(suffix?.hasAttribute('hidden')).toBe(false);
    });
  });

  // ── Clipboard ──────────────────────────────────────────────────────────────

  describe('Copy behaviour', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        writable: true,
      });
    });

    it('copies value to clipboard on click', async () => {
      const value = 'npm install @vielzeug/ripple';

      fixture = await mountCopyCommand(value);

      const btn = fixture.element.shadowRoot!.querySelector<HTMLButtonElement>(`[part="${COPY_BTN_PART}"]`)!;

      btn.click();
      await Promise.resolve();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(value);
    });

    it('switches to check icon after copy', async () => {
      fixture = await mountCopyCommand('npm install @vielzeug/ripple');

      const btn = fixture.element.shadowRoot!.querySelector<HTMLButtonElement>(`[part="${COPY_BTN_PART}"]`)!;

      btn.click();
      await Promise.resolve();
      await Promise.resolve();

      const icon = fixture.element.shadowRoot!.querySelector('sg-icon');

      expect(icon?.getAttribute('name')).toBe('check');
    });

    it('updates aria-label to "Copied!" after copy', async () => {
      fixture = await mountCopyCommand('npm install @vielzeug/ripple');

      const btn = fixture.element.shadowRoot!.querySelector<HTMLButtonElement>(`[part="${COPY_BTN_PART}"]`)!;

      btn.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(btn.getAttribute('aria-label')).toBe('Copied!');
    });

    it('emits copy event with value on success', async () => {
      const value = 'npm install @vielzeug/ripple';

      fixture = await mountCopyCommand(value);

      const copyHandler = vi.fn();

      fixture.element.addEventListener('copy', copyHandler);

      const btn = fixture.element.shadowRoot!.querySelector<HTMLButtonElement>(`[part="${COPY_BTN_PART}"]`)!;

      btn.click();
      await Promise.resolve();

      expect(copyHandler).toHaveBeenCalledOnce();
      expect((copyHandler.mock.calls[0][0] as CustomEvent).detail).toEqual({ value });
    });

    it('does nothing when value is empty', async () => {
      fixture = await mountCopyCommand('');

      const btn = fixture.element.shadowRoot!.querySelector<HTMLButtonElement>(`[part="${COPY_BTN_PART}"]`)!;

      btn.click();
      await Promise.resolve();

      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    it('silently fails when clipboard is unavailable', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) },
        writable: true,
      });

      fixture = await mountCopyCommand('npm install @vielzeug/ripple');

      const btn = fixture.element.shadowRoot!.querySelector<HTMLButtonElement>(`[part="${COPY_BTN_PART}"]`)!;

      await expect(async () => {
        btn.click();
        await Promise.resolve();
        await Promise.resolve();
      }).not.toThrow();

      const icon = fixture.element.shadowRoot!.querySelector('sg-icon');

      expect(icon?.getAttribute('name')).toBe('copy');
    });
  });

  // ── Attributes ─────────────────────────────────────────────────────────────

  describe('Attributes', () => {
    it('reflects the value attribute', async () => {
      fixture = await mountCopyCommand('npx -y @vielzeug/codex');

      expect(fixture.element.getAttribute('value')).toBe('npx -y @vielzeug/codex');
    });

    it('applies size attribute to host', async () => {
      fixture = await mountCopyCommand('npm install', { size: 'sm' });

      expect(fixture.element.getAttribute('size')).toBe('sm');
    });

    it('applies variant attribute to host', async () => {
      fixture = await mountCopyCommand('npm install', { variant: 'bordered' });

      expect(fixture.element.getAttribute('variant')).toBe('bordered');
    });

    it('applies rounded attribute to host', async () => {
      fixture = await mountCopyCommand('npm install', { rounded: 'lg' });

      expect(fixture.element.getAttribute('rounded')).toBe('lg');
    });
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('has no axe violations', async () => {
      fixture = await mountCopyCommand('npm install @vielzeug/ripple');

      await axeCheck(fixture.element);
    });

    it('command button has descriptive aria-label', async () => {
      fixture = await mountCopyCommand('npm install @vielzeug/ripple');

      const btn = fixture.element.shadowRoot!.querySelector<HTMLButtonElement>(`[part="${COPY_BTN_PART}"]`)!;

      expect(btn.getAttribute('aria-label')).toContain('npm install @vielzeug/ripple');
    });

    it('live region is present for screen reader announcements', async () => {
      fixture = await mountCopyCommand('npm install @vielzeug/ripple');

      const live = fixture.element.shadowRoot!.querySelector('[role="status"]');

      expect(live).toBeTruthy();
    });
  });
});
