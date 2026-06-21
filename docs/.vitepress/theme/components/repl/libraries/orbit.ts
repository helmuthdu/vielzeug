export const description = 'Lightweight floating-element positioning for elements.';

export const loader = async () => {
  const [main, presetsModule] = await Promise.all([import('@vielzeug/orbit'), import('@vielzeug/orbit/presets')]);

  return { ...main, ...presetsModule };
};

export const apiExports = [
  'float',
  'computePosition',
  'computeOnce',
  'autoUpdate',
  'detectOverflow',
  'getSide',
  'getAlignment',
  'compose',
  'offset',
  'flip',
  'autoPlacement',
  'shift',
  'size',
  'arrow',
  'hide',
  'limitShift',
  'tooltip',
  'dropdown',
  'popover',
  'contextMenu',
] as const;
