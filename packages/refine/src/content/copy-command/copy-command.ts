import { define, html, prop } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';

import type { ComponentSize, RoundedSize } from '../../types';

import { srOnlyMixin } from '../../styles';
import '../icon/icon';
import componentStyles from './copy-command.css?inline';

/** Copy command component properties */
export type OreCopyCommandProps = {
  /** Border radius size */
  rounded?: RoundedSize;
  /** Component size */
  size?: ComponentSize;
  /** The command string to display and copy to clipboard */
  value?: string;
  /** Visual style variant */
  variant?: 'flat' | 'bordered' | 'ghost';
};

/** Copy command component events */
export type OreCopyCommandEvents = {
  /** Emitted when the command is successfully copied to the clipboard */
  copy: { value: string };
};

/**
 * A styled, copy-to-clipboard command display component.
 * Shows a command string in a monospace code block with a copy button.
 * Clicking the component copies the value to the clipboard, shows a transient
 * check-mark confirmation, and emits a `copy` event.
 *
 * @element ore-copy-command
 *
 * @attr {string} value - The command string to display and copy
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Visual style: 'flat' | 'bordered' | 'ghost'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 *
 * @fires copy - Emitted on successful clipboard write. detail: { value: string }
 *
 * @slot suffix - Optional controls appended after the copy button (e.g. a cycle button)
 *
 * @cssprop --copy-command-bg - Background color of the command block
 * @cssprop --copy-command-color - Text color of the command string
 * @cssprop --copy-command-border-color - Border color
 * @cssprop --copy-command-radius - Border radius (overrides the `rounded` attribute)
 * @cssprop --copy-command-padding - Inner padding of the command button
 * @cssprop --copy-command-font-size - Font size of the command string
 * @cssprop --copy-command-icon-color - Color of the copy/check icon
 * @cssprop --copy-command-hover-bg - Background on hover
 *
 * @part wrapper - Outer flex container
 * @part command - The copy button element
 * @part command-text - The `<code>` element displaying the command string
 * @part copy-icon - The icon wrapper span
 * @part suffix - Suffix slot container
 *
 * @example
 * ```html
 * <ore-copy-command value="npm install @vielzeug/ripple"></ore-copy-command>
 *
 * <ore-copy-command value="npx -y @vielzeug/codex" size="sm" variant="bordered"></ore-copy-command>
 *
 * <!-- With a suffix slot (e.g. a cycle button) -->
 * <ore-copy-command value="npm install @vielzeug/ripple">
 *   <button slot="suffix" type="button" aria-label="Next package">›</button>
 * </ore-copy-command>
 * ```
 */
export const COPY_COMMAND_TAG = 'ore-copy-command' as const;

define<OreCopyCommandProps, OreCopyCommandEvents>(COPY_COMMAND_TAG, {
  props: {
    rounded: prop.string<RoundedSize>('md'),
    size: prop.string<ComponentSize>('md'),
    value: prop.string(''),
    variant: prop.string<'flat' | 'bordered' | 'ghost'>('flat'),
  },

  setup(props, { emit, onCleanup, slots }) {
    const copied = signal(false);
    const copyFailed = signal(false);
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    onCleanup(() => {
      if (resetTimer !== null) clearTimeout(resetTimer);
    });

    const handleCopy = async () => {
      const text = props.value.value ?? '';

      if (!text) return;

      if (resetTimer !== null) clearTimeout(resetTimer);

      try {
        await navigator.clipboard.writeText(text);
        copied.value = true;
        copyFailed.value = false;
        emit('copy', { value: text });
      } catch {
        // Clipboard access denied or unavailable (e.g. insecure context) — surface it instead of failing silently
        copied.value = false;
        copyFailed.value = true;
      }

      resetTimer = setTimeout(() => {
        copied.value = false;
        copyFailed.value = false;
        resetTimer = null;
      }, 2000);
    };

    const hasSuffix = computed(() => slots.has('suffix').value);
    const btnLabel = computed(() => {
      if (copied.value) return 'Copied!';

      if (copyFailed.value) return 'Copy failed — press to try again';

      return `Copy: ${props.value.value ?? ''}`;
    });

    return html`
      <div class="wrapper" part="wrapper">
        <button class="command" part="command" type="button" :aria-label="${btnLabel}" @click=${handleCopy}>
          <code class="command-text" part="command-text">${props.value}</code>
          <span class="copy-icon" part="copy-icon" aria-hidden="true">
            ${() => {
              if (copied.value)
                return html`<ore-icon name="check" size="14" class="icon-copied" aria-hidden="true"></ore-icon>`;

              if (copyFailed.value)
                return html`<ore-icon name="circle-alert" size="14" class="icon-failed" aria-hidden="true"></ore-icon>`;

              return html`<ore-icon name="copy" size="14" aria-hidden="true"></ore-icon>`;
            }}
          </span>
        </button>
        <div class="suffix" part="suffix" ?hidden="${() => !hasSuffix.value}">
          <slot name="suffix"></slot>
        </div>
      </div>
      <div role="status" class="sr-only">
        ${() => {
          if (copied.value) return 'Copied to clipboard.';

          if (copyFailed.value) return 'Copy failed. Select the command text and copy it manually.';

          return '';
        }}
      </div>
    `;
  },

  styles: [srOnlyMixin, componentStyles],
});
