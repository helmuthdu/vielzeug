import { type Fixture, mount, user } from '@vielzeug/ore/testing';

const getTextarea = (fixture: Fixture<HTMLElement>): HTMLTextAreaElement => fixture.query('textarea')!;

const getSendButton = (fixture: Fixture<HTMLElement>): HTMLElement => fixture.query('ore-button')!;

describe('ore-message-composer', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./message-composer'))();
    await (() => import('../form/form'))();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a textarea and a default send button', async () => {
      fixture = await mount('ore-message-composer');

      expect(fixture.query('textarea')).toBeTruthy();
      expect(fixture.query('ore-button')).toBeTruthy();
    });

    it('renders with an initial value', async () => {
      fixture = await mount('ore-message-composer', { attrs: { value: 'draft' } });

      expect(getTextarea(fixture).value).toBe('draft');
    });

    it('forwards placeholder to the inner field', async () => {
      fixture = await mount('ore-message-composer', { attrs: { placeholder: 'Ask anything…' } });

      expect(getTextarea(fixture).placeholder).toBe('Ask anything…');
    });

    it('renders the field above a separate toolbar row', async () => {
      fixture = await mount('ore-message-composer');

      const composer = fixture.query('.composer')!;
      const field = fixture.query('.field')!;
      const toolbar = fixture.query('.toolbar')!;

      expect(composer.contains(field)).toBe(true);
      expect(composer.contains(toolbar)).toBe(true);
      expect(toolbar.contains(field)).toBe(false);
      expect(Array.from(composer.children).indexOf(field)).toBeLessThan(Array.from(composer.children).indexOf(toolbar));
    });

    it('places the send button in the toolbar end group, not alongside the field', async () => {
      fixture = await mount('ore-message-composer');

      const toolbarEnd = fixture.query('.toolbar-end')!;

      expect(toolbarEnd.contains(getSendButton(fixture))).toBe(true);
    });
  });

  // ─── Send button state ───────────────────────────────────────────────────────

  describe('Send button state', () => {
    it('disables the send button when blank', async () => {
      fixture = await mount('ore-message-composer');

      expect((getSendButton(fixture) as HTMLElementTagNameMap['ore-button']).disabled).toBe(true);
    });

    it('disables the send button when whitespace-only', async () => {
      fixture = await mount('ore-message-composer');

      await user.type(getTextarea(fixture), '   ');
      await fixture.flush();

      expect((getSendButton(fixture) as HTMLElementTagNameMap['ore-button']).disabled).toBe(true);
    });

    it('enables the send button once non-blank', async () => {
      fixture = await mount('ore-message-composer');

      await user.type(getTextarea(fixture), 'hi');
      await fixture.flush();

      expect((getSendButton(fixture) as HTMLElementTagNameMap['ore-button']).disabled).toBe(false);
    });

    it('disables the send button while disabled', async () => {
      fixture = await mount('ore-message-composer', { attrs: { disabled: true, value: 'hi' } });

      expect((getSendButton(fixture) as HTMLElementTagNameMap['ore-button']).disabled).toBe(true);
    });

    it('disables the send button while loading', async () => {
      fixture = await mount('ore-message-composer', { attrs: { loading: true, value: 'hi' } });

      expect((getSendButton(fixture) as HTMLElementTagNameMap['ore-button']).disabled).toBe(true);
    });
  });

  // ─── Sending ──────────────────────────────────────────────────────────────────

  describe('Sending', () => {
    it('sends on click and clears the field', async () => {
      fixture = await mount('ore-message-composer', { attrs: { value: 'hello' } });

      const sendHandler = vi.fn();

      fixture.element.addEventListener('send', sendHandler);

      await user.click(getSendButton(fixture));

      expect(sendHandler).toHaveBeenCalledTimes(1);
      expect((sendHandler.mock.calls[0][0] as CustomEvent).detail.value).toBe('hello');
      expect(getTextarea(fixture).value).toBe('');
    });

    it('sends on Enter, preventing the newline', async () => {
      fixture = await mount('ore-message-composer');

      const sendHandler = vi.fn();

      fixture.element.addEventListener('send', sendHandler);

      const textarea = getTextarea(fixture);

      await user.type(textarea, 'hello');
      await user.press(textarea, 'Enter');

      expect(sendHandler).toHaveBeenCalledTimes(1);
      expect(textarea.value).toBe('');
    });

    it('does not send on Shift+Enter, leaving the field editable', async () => {
      fixture = await mount('ore-message-composer');

      const sendHandler = vi.fn();

      fixture.element.addEventListener('send', sendHandler);

      const textarea = getTextarea(fixture);

      await user.type(textarea, 'hello');
      await user.press(textarea, 'Enter', { shiftKey: true });

      expect(sendHandler).not.toHaveBeenCalled();
      expect(textarea.value).toBe('hello');
    });

    it('does not send on click while blank', async () => {
      fixture = await mount('ore-message-composer');

      const sendHandler = vi.fn();

      fixture.element.addEventListener('send', sendHandler);

      await user.click(getSendButton(fixture));

      expect(sendHandler).not.toHaveBeenCalled();
    });

    it('trims surrounding whitespace in the send detail', async () => {
      fixture = await mount('ore-message-composer', { attrs: { value: '  hi  ' } });

      const sendHandler = vi.fn();

      fixture.element.addEventListener('send', sendHandler);

      await user.click(getSendButton(fixture));

      expect((sendHandler.mock.calls[0][0] as CustomEvent).detail.value).toBe('hi');
    });

    it('keeps the value when a `send` listener calls preventDefault()', async () => {
      fixture = await mount('ore-message-composer', { attrs: { value: 'hello' } });

      fixture.element.addEventListener('send', (e) => e.preventDefault());

      await user.click(getSendButton(fixture));

      expect(getTextarea(fixture).value).toBe('hello');
    });

    it('does not refocus the field when a `send` listener calls preventDefault()', async () => {
      fixture = await mount('ore-message-composer', { attrs: { value: 'hello' }, container: document.body });

      fixture.element.addEventListener('send', (e) => e.preventDefault());

      getTextarea(fixture).blur();
      await user.click(getSendButton(fixture));

      // preventDefault() means "skip the default clear + refocus" — both halves, not just the
      // clear — so focus should land wherever the click itself left it, not get yanked back.
      expect(fixture.shadow?.activeElement).not.toBe(getTextarea(fixture));
    });

    it('keeps the value when clear-on-send is false', async () => {
      fixture = await mount('ore-message-composer', { attrs: { 'clear-on-send': 'false', value: 'hello' } });

      await user.click(getSendButton(fixture));

      expect(getTextarea(fixture).value).toBe('hello');
    });

    it('refocuses the field after a send', async () => {
      fixture = await mount('ore-message-composer', { attrs: { value: 'hello' }, container: document.body });

      await user.click(getSendButton(fixture));

      expect(fixture.shadow?.activeElement).toBe(getTextarea(fixture));
    });
  });

  // ─── send-shortcut ────────────────────────────────────────────────────────────

  describe('send-shortcut="mod+enter"', () => {
    it('does not send on plain Enter, inserting a newline instead', async () => {
      fixture = await mount('ore-message-composer', { attrs: { 'send-shortcut': 'mod+enter' } });

      const sendHandler = vi.fn();

      fixture.element.addEventListener('send', sendHandler);

      const textarea = getTextarea(fixture);

      await user.type(textarea, 'hello');
      await user.press(textarea, 'Enter');

      expect(sendHandler).not.toHaveBeenCalled();
    });

    it('sends on Ctrl/Cmd+Enter', async () => {
      fixture = await mount('ore-message-composer', { attrs: { 'send-shortcut': 'mod+enter' } });

      const sendHandler = vi.fn();

      fixture.element.addEventListener('send', sendHandler);

      const textarea = getTextarea(fixture);

      await user.type(textarea, 'hello');
      await user.press(textarea, 'Enter', { metaKey: true });

      expect(sendHandler).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Slots ────────────────────────────────────────────────────────────────────

  describe('Slots', () => {
    it('renders slotted prefix/suffix content', async () => {
      fixture = await mount('ore-message-composer', {
        html: '<button slot="prefix" id="attach">Attach</button><button slot="suffix" id="emoji">🙂</button>',
      });

      expect(fixture.element.querySelector('#attach')).toBeTruthy();
      expect(fixture.element.querySelector('#emoji')).toBeTruthy();
    });

    it('assigns prefix to the toolbar start group and suffix to the toolbar end group', async () => {
      fixture = await mount('ore-message-composer', {
        html: '<button slot="prefix" id="attach">Attach</button><button slot="suffix" id="emoji">🙂</button>',
      });

      const toolbarStartSlot = fixture.query<HTMLSlotElement>('.toolbar-start slot')!;
      const toolbarEndSlot = fixture.query<HTMLSlotElement>('.toolbar-end slot[name="suffix"]')!;

      expect(toolbarStartSlot.assignedElements()).toContain(fixture.element.querySelector('#attach'));
      expect(toolbarEndSlot.assignedElements()).toContain(fixture.element.querySelector('#emoji'));
    });

    it('replaces the default send button when a `send` slot is provided', async () => {
      fixture = await mount('ore-message-composer', {
        html: '<button slot="send" id="custom-send">Go</button>',
      });

      expect(fixture.element.querySelector('#custom-send')).toBeTruthy();
      expect(fixture.query('ore-button')).toBeFalsy();
    });
  });

  // ─── Field state (label/helper/error/counter) ────────────────────────────────

  describe('Field state', () => {
    it('defaults the field accessible name to "Message"', async () => {
      fixture = await mount('ore-message-composer');

      expect(getTextarea(fixture).getAttribute('aria-label')).toBe('Message');
    });

    it('overrides the field accessible name via `label`', async () => {
      fixture = await mount('ore-message-composer', { attrs: { label: 'Reply' } });

      expect(getTextarea(fixture).getAttribute('aria-label')).toBe('Reply');
    });

    it('reflects the resolved send shortcut as aria-keyshortcuts', async () => {
      fixture = await mount('ore-message-composer', { attrs: { 'send-shortcut': 'mod+enter' } });

      expect(getTextarea(fixture).getAttribute('aria-keyshortcuts')).toBe('Control+Enter Meta+Enter');
    });

    it('renders helper text', async () => {
      fixture = await mount('ore-message-composer', { attrs: { helper: 'Markdown supported' } });

      expect(fixture.query('.helper-text:not([role="alert"])')?.textContent?.trim()).toBe('Markdown supported');
    });

    it('renders error text with role="alert" and sets aria-invalid', async () => {
      fixture = await mount('ore-message-composer', { attrs: { error: 'Message failed to send' } });

      const errorEl = fixture.query('.helper-text[role="alert"]');

      expect(errorEl?.textContent?.trim()).toBe('Message failed to send');
      expect(getTextarea(fixture).getAttribute('aria-invalid')).toBe('true');
    });

    it('shows a character counter once maxlength is set', async () => {
      fixture = await mount('ore-message-composer', { attrs: { maxlength: 10, value: 'hi' } });

      expect(fixture.query('.counter')?.textContent?.trim()).toBe('2/10');
    });

    it('sets the native maxlength attribute on the field', async () => {
      fixture = await mount('ore-message-composer', { attrs: { maxlength: 10 } });

      expect(getTextarea(fixture).maxLength).toBe(10);
    });
  });

  // ─── Attribute reflection ─────────────────────────────────────────────────────

  describe('Attribute reflection', () => {
    it('reflects fullwidth, size, and color onto the host', async () => {
      fixture = await mount('ore-message-composer', { attrs: { color: 'success', fullwidth: true, size: 'lg' } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
      expect(fixture.element.getAttribute('size')).toBe('lg');
      expect(fixture.element.getAttribute('color')).toBe('success');
    });

    it('applies the send button color from `color`', async () => {
      fixture = await mount('ore-message-composer', { attrs: { color: 'success' } });

      expect((getSendButton(fixture) as HTMLElementTagNameMap['ore-button']).getAttribute('color')).toBe('success');
    });
  });

  // ─── Variants ─────────────────────────────────────────────────────────────────
  // Same five-value set as ore-textarea (solid/flat/bordered/outline/ghost), not a bespoke
  // boolean — see message-composer.css.

  describe('Variants', () => {
    const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost'] as const;

    variants.forEach((variant) => {
      it(`reflects variant="${variant}" onto the host`, async () => {
        fixture = await mount('ore-message-composer', { attrs: { variant } });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    });

    it('defaults to no variant attribute (solid)', async () => {
      fixture = await mount('ore-message-composer');

      expect(fixture.element.hasAttribute('variant')).toBe(false);
    });
  });

  // ─── Required / form validation ──────────────────────────────────────────────

  describe('Required State', () => {
    it('fails constraint validation while required and blank; passes once non-blank', async () => {
      fixture = await mount('ore-message-composer', { attrs: { required: true } });

      const element = fixture.element as HTMLElement & { checkValidity(): boolean };

      expect(element.checkValidity()).toBe(false);

      await user.type(getTextarea(fixture), 'hi');
      expect(element.checkValidity()).toBe(true);
    });

    it('passes constraint validation when not required, even while blank', async () => {
      fixture = await mount('ore-message-composer');

      expect((fixture.element as HTMLElement & { checkValidity(): boolean }).checkValidity()).toBe(true);
    });

    it('passes constraint validation while readonly and blank, even when required', async () => {
      fixture = await mount('ore-message-composer', { attrs: { readonly: true, required: true } });

      expect((fixture.element as HTMLElement & { checkValidity(): boolean }).checkValidity()).toBe(true);
    });
  });

  // ─── Form reset ───────────────────────────────────────────────────────────────

  describe('Form reset', () => {
    it('restores the value typed by the user when the ancestor form resets', async () => {
      const form = document.createElement('form');

      document.body.appendChild(form);
      fixture = await mount('ore-message-composer', { attrs: { value: 'initial' }, container: form });

      await user.type(getTextarea(fixture), ' more');
      expect(getTextarea(fixture).value).toBe('initial more');

      form.reset();
      await fixture.flush();

      expect(getTextarea(fixture).value).toBe('initial');
      form.remove();
    });

    it('tracks a `value` attribute change made after mount as the new reset target', async () => {
      const form = document.createElement('form');

      document.body.appendChild(form);
      fixture = await mount('ore-message-composer', { attrs: { value: 'initial' }, container: form });

      await fixture.attr('value', 'updated-default');
      await user.type(getTextarea(fixture), ' more');

      form.reset();
      await fixture.flush();

      expect(getTextarea(fixture).value).toBe('updated-default');
      form.remove();
    });
  });

  // ─── Send button customization ────────────────────────────────────────────────

  describe('send-icon / send-label', () => {
    it('overrides the send button accessible label via `send-label`', async () => {
      fixture = await mount('ore-message-composer', { attrs: { 'send-label': 'Submit' } });

      expect(getSendButton(fixture).getAttribute('aria-label')).toBe('Submit');
    });

    it('overrides the default send icon via `send-icon`', async () => {
      fixture = await mount('ore-message-composer', { attrs: { 'send-icon': 'send' } });

      expect(fixture.query('ore-icon')?.getAttribute('name')).toBe('send');
    });
  });

  // ─── ref prop ─────────────────────────────────────────────────────────────────

  describe('ref prop', () => {
    it('invokes the ref callback with the raw <textarea> element on mount', async () => {
      const calls: (HTMLTextAreaElement | null)[] = [];

      fixture = await mount('ore-message-composer', {
        props: { ref: (el: HTMLTextAreaElement | null) => calls.push(el) },
      });
      await fixture.flush();

      expect(calls[0]).toBeInstanceOf(HTMLTextAreaElement);
    });

    it('invokes the ref callback with null on unmount', async () => {
      const calls: (HTMLTextAreaElement | null)[] = [];

      fixture = await mount('ore-message-composer', {
        props: { ref: (el: HTMLTextAreaElement | null) => calls.push(el) },
      });
      await fixture.flush();

      fixture.dispose();

      expect(calls.at(-1)).toBeNull();
    });
  });

  // ─── Accessibility ────────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('defaults the send button accessible label to "Send message"', async () => {
      fixture = await mount('ore-message-composer');

      expect(getSendButton(fixture).getAttribute('aria-label')).toBe('Send message');
    });

    it('has no axe violations in the default state', async () => {
      fixture = await mount('ore-message-composer');

      expect((await axeCheck(fixture.element)).violations).toHaveLength(0);
    });

    it('has no axe violations with an error and slotted content', async () => {
      fixture = await mount('ore-message-composer', {
        attrs: { error: 'Message failed to send', value: 'hi' },
        html: '<button slot="prefix" aria-label="Attach file">📎</button>',
      });

      expect((await axeCheck(fixture.element)).violations).toHaveLength(0);
    });

    it('has no axe violations while loading', async () => {
      fixture = await mount('ore-message-composer', { attrs: { loading: true, value: 'hi' } });

      expect((await axeCheck(fixture.element)).violations).toHaveLength(0);
    });

    it('reflects disabled onto the native field', async () => {
      fixture = await mount('ore-message-composer', { attrs: { disabled: true } });

      expect(getTextarea(fixture).disabled).toBe(true);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('never sends while an IME composition is in progress', async () => {
      fixture = await mount('ore-message-composer');

      const sendHandler = vi.fn();

      fixture.element.addEventListener('send', sendHandler);

      const textarea = getTextarea(fixture);

      await user.type(textarea, 'hello');
      textarea.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, isComposing: true, key: 'Enter' }));
      await fixture.flush();

      expect(sendHandler).not.toHaveBeenCalled();
    });

    it('re-evaluates the send button reactively when disabled toggles after mount', async () => {
      fixture = await mount('ore-message-composer', { attrs: { value: 'hi' } });

      expect((getSendButton(fixture) as HTMLElementTagNameMap['ore-button']).disabled).toBe(false);

      await fixture.attr('disabled', true);

      expect((getSendButton(fixture) as HTMLElementTagNameMap['ore-button']).disabled).toBe(true);
    });

    it('emits input on every keystroke with the current value', async () => {
      fixture = await mount('ore-message-composer');

      const inputHandler = vi.fn();

      fixture.element.addEventListener('input', inputHandler);

      await user.type(getTextarea(fixture), 'h');

      expect(inputHandler).toHaveBeenCalled();
      expect((inputHandler.mock.calls[0][0] as CustomEvent).detail.value).toBe('h');
    });

    it('participates directly in ore-form FormData collection (no nested field to borrow registration from)', async () => {
      fixture = await mount('ore-form', {
        html: '<ore-message-composer name="message" value="hello"></ore-message-composer>',
      });

      await fixture.flush();

      let capturedData: FormData | undefined;

      fixture.element.addEventListener('submit', (e) => {
        capturedData = (e as unknown as CustomEvent).detail?.formData as FormData | undefined;
      });

      fixture.query('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(capturedData?.get('message')).toBe('hello');
    });
  });
});
