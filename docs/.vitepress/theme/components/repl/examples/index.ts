import { archiveExamples } from './archive';
import { arsenalExamples } from './arsenal';
import { assayExamples } from './assay';
import { atlasExamples } from './atlas';
import { bardExamples } from './bard';
import { beaconExamples } from './beacon';
import { clockworkExamples } from './clockwork';
import { coinsExamples } from './coins';
import { conduitExamples } from './conduit';
import { courierExamples } from './courier';
import { dndExamples } from './dnd';
import { familiarExamples } from './familiar';
import { fluxExamples } from './flux';
import { focusExamples } from './focus';
import { forgeExamples } from './forge';
import { gestureExamples } from './gesture';
import { heraldExamples } from './herald';
import { illusionistExamples } from './illusionist';
import { inkExamples } from './ink';
import { keymapExamples } from './keymap';
import { ledgerExamples } from './ledger';
import { linguaExamples } from './lingua';
import { meshExamples } from './mesh';
import { necromancerExamples } from './necromancer';
import { orbitExamples } from './orbit';
import { oreExamples } from './ore';
import { paletteExamples } from './palette';
import { patchworkExamples } from './patchwork';
import { postmasterExamples } from './postmaster';
import { prismExamples } from './prism';
import { pulseExamples } from './pulse';
import { refineExamples } from './refine';
import { rippleExamples } from './ripple';
import { runeExamples } from './rune';
import { sandboxExamples } from './sandbox';
import { scoutExamples } from './scout';
import { scribeExamples } from './scribe';
import { scrollExamples } from './scroll';
import { sentinelExamples } from './sentinel';
import { sigilExamples } from './sigil';
import { sourcererExamples } from './sourcerer';
import { spellExamples } from './spell';
import { stageExamples } from './stage';
import { tabulaExamples } from './tabula';
import { tandemExamples } from './tandem';
import { tavernExamples } from './tavern';
import { tempoExamples } from './tempo';
import type { ExampleModule } from './types';
import { vaultExamples } from './vault';
import { wardExamples } from './ward';
import { wayfinderExamples } from './wayfinder';
import { wireExamples } from './wire';

export const examples: Record<string, Record<string, ExampleModule>> = {
  archive: archiveExamples,
  arsenal: arsenalExamples,
  assay: assayExamples,
  atlas: atlasExamples,
  bard: bardExamples,
  beacon: beaconExamples,
  clockwork: clockworkExamples,
  coins: coinsExamples,
  conduit: conduitExamples,
  courier: courierExamples,
  dnd: dndExamples,
  familiar: familiarExamples,
  flux: fluxExamples,
  focus: focusExamples,
  forge: forgeExamples,
  gesture: gestureExamples,
  herald: heraldExamples,
  illusionist: illusionistExamples,
  ink: inkExamples,
  keymap: keymapExamples,
  ledger: ledgerExamples,
  lingua: linguaExamples,
  mesh: meshExamples,
  necromancer: necromancerExamples,
  orbit: orbitExamples,
  ore: oreExamples,
  palette: paletteExamples,
  patchwork: patchworkExamples,
  postmaster: postmasterExamples,
  prism: prismExamples,
  pulse: pulseExamples,
  refine: refineExamples,
  ripple: rippleExamples,
  rune: runeExamples,
  sandbox: sandboxExamples,
  scout: scoutExamples,
  scribe: scribeExamples,
  scroll: scrollExamples,
  sentinel: sentinelExamples,
  sigil: sigilExamples,
  sourcerer: sourcererExamples,
  spell: spellExamples,
  stage: stageExamples,
  tabula: tabulaExamples,
  tandem: tandemExamples,
  tavern: tavernExamples,
  tempo: tempoExamples,
  vault: vaultExamples,
  ward: wardExamples,
  wayfinder: wayfinderExamples,
  wire: wireExamples,
};
