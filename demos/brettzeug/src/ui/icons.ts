import { type IconNode, registerIcons } from '@vielzeug/refine/icon';

/** Authored to Lucide's 24-grid so they sit with Refine's built-in icons. */
const sun: IconNode = [
  ['circle', { cx: 12, cy: 12, r: 4 }],
  ['path', { d: 'M12 2v2' }],
  ['path', { d: 'M12 20v2' }],
  ['path', { d: 'm4.93 4.93 1.41 1.41' }],
  ['path', { d: 'm17.66 17.66 1.41 1.41' }],
  ['path', { d: 'M2 12h2' }],
  ['path', { d: 'M20 12h2' }],
  ['path', { d: 'm6.34 17.66-1.41 1.41' }],
  ['path', { d: 'm19.07 4.93-1.41 1.41' }],
];

const moon: IconNode = [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]];

const layoutGrid: IconNode = [
  ['rect', { height: 7, rx: 1, width: 7, x: 3, y: 3 }],
  ['rect', { height: 7, rx: 1, width: 7, x: 14, y: 3 }],
  ['rect', { height: 7, rx: 1, width: 7, x: 3, y: 14 }],
  ['rect', { height: 7, rx: 1, width: 7, x: 14, y: 14 }],
];

const bookOpen: IconNode = [
  ['path', { d: 'M12 7v14' }],
  ['path', { d: 'M3 18V5a1 1 0 0 1 1-1h4a4 4 0 0 1 4 4 4 4 0 0 1 4-4h4a1 1 0 0 1 1 1v13' }],
  ['path', { d: 'M3 18a3 3 0 0 1 3-3h2a4 4 0 0 1 4 4 4 4 0 0 1 4-4h2a3 3 0 0 1 3 3' }],
];

const layers2: IconNode = [
  ['path', { d: 'm12 3 9 5-9 5-9-5 9-5Z' }],
  ['path', { d: 'm3 12 9 5 9-5' }],
  ['path', { d: 'm3 16 9 5 9-5' }],
];

const userRound: IconNode = [
  ['circle', { cx: 12, cy: 8, r: 5 }],
  ['path', { d: 'M20 21a8 8 0 0 0-16 0' }],
];

const mail: IconNode = [
  ['rect', { height: 14, rx: 2, width: 18, x: 3, y: 5 }],
  ['path', { d: 'm3 7 9 6 9-6' }],
];

registerIcons({ bookOpen, boxes: layers2, layoutGrid, mail, moon, sun, userRound });
