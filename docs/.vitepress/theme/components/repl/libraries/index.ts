import * as arsenal from './arsenal';
import * as clockwork from './clockwork';
import * as coins from './coins';
import * as conduit from './conduit';
import * as courier from './courier';
import * as dnd from './dnd';
import * as familiar from './familiar';
import * as flux from './flux';
import * as forge from './forge';
import * as herald from './herald';
import * as keymap from './keymap';
import * as ledger from './ledger';
import * as lingua from './lingua';
import * as orbit from './orbit';
import * as pulse from './pulse';
import * as ripple from './ripple';
import * as rune from './rune';
import * as sandbox from './sandbox';
import * as scout from './scout';
import * as scroll from './scroll';
import * as sourcerer from './sourcerer';
import * as spell from './spell';
import * as tempo from './tempo';
import * as vault from './vault';
import * as ward from './ward';
import * as wayfinder from './wayfinder';

const ALL = {
  arsenal,
  clockwork,
  coins,
  conduit,
  courier,
  dnd,
  familiar,
  flux,
  forge,
  herald,
  keymap,
  ledger,
  lingua,
  orbit,
  pulse,
  ripple,
  rune,
  sandbox,
  scout,
  scroll,
  sourcerer,
  spell,
  tempo,
  vault,
  ward,
  wayfinder,
} as const;

type LibName = keyof typeof ALL;

export const LIBRARY_DESCRIPTIONS = Object.fromEntries(
  (Object.keys(ALL) as LibName[]).map((k) => [k, ALL[k].description]),
) as Record<LibName, string>;

export const LIBRARY_LOADERS = Object.fromEntries(
  (Object.keys(ALL) as LibName[]).map((k) => [k, ALL[k].loader]),
) as Record<LibName, () => Promise<unknown>>;

export const LIBRARY_EXPORTS = Object.fromEntries(
  (Object.keys(ALL) as LibName[]).map((k) => [k, ALL[k].apiExports]),
) as Record<LibName, readonly string[]>;

export const ARSENAL_CATEGORIES = arsenal.categories;
