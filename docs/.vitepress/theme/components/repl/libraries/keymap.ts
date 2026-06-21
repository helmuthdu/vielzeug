export const description =
  'Headless keyboard shortcut manager with chord sequences, context guards, and disposable bindings.';

export const loader = () => import('@vielzeug/keymap');

export const apiExports = [
  'createKeymap',
  'createKeymapLayer',
  'formatShortcut',
  'matchStep',
  'parseShortcut',
] as const;
