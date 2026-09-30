import * as lucideModule from 'lucide';

import { type IconNode, registerIcons } from './core/icon-registry';

/**
 * Seeds `ore-icon`'s registry with the complete Lucide set (~2,100 icons,
 * ~100 kB gzipped) so any icon name resolves at runtime. Import this side-effect
 * module when icon names come from data rather than a known set; apps that render
 * a known icon set instead register only what they use via `registerIcons()` and
 * skip the whole library.
 *
 * @example
 * ```ts
 * import '@vielzeug/refine/icon-lucide';
 * ```
 */
registerIcons((lucideModule as unknown as { icons: Record<string, IconNode> }).icons);
