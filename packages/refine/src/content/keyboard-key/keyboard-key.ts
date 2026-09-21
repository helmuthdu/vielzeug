import { define, html, prop } from '@vielzeug/ore';
import { reducedMotionMixin } from '../../styles';
import componentStyles from './keyboard-key.css?inline';
import shortcutStyles from './keyboard-shortcut.css?inline';

export type KeyboardKeySize = 'sm' | 'lg';

export type OreKeyboardKeyProps = {
  pressed?: boolean;
  size?: KeyboardKeySize;
  symbol?: string;
};

export type OreKeyboardShortcutProps = {
  pressed?: boolean;
};

export const KEYBOARD_SHORTCUT_TAG = 'ore-keyboard-shortcut' as const;
define<OreKeyboardShortcutProps>(KEYBOARD_SHORTCUT_TAG, {
  props: {
    pressed: prop.bool(false),
  },
  setup(props) {
    return html`
      <span class="shortcut" part="shortcut" ?data-pressed="${props.pressed}"><slot></slot></span>
    `;
  },
  styles: [reducedMotionMixin, shortcutStyles],
});

export const KEYBOARD_KEY_TAG = 'ore-keyboard-key' as const;
define<OreKeyboardKeyProps>(KEYBOARD_KEY_TAG, {
  props: {
    pressed: prop.bool(false),
    size: prop.string<KeyboardKeySize>('sm'),
    symbol: prop.string(),
  },
  setup(props) {
    return html`
      <kbd class="key" part="key" ?data-has-symbol="${() => Boolean(props.symbol.value)}" ?data-pressed="${props.pressed}">
        <span class="symbol" aria-hidden="true" ?hidden="${() => !props.symbol.value}">${props.symbol}</span>
        <span class="label"><slot></slot></span>
      </kbd>
    `;
  },
  styles: [reducedMotionMixin, componentStyles],
});
