<script lang="ts" setup>
import { t } from '../../../app/i18n';
import type { RouteName } from '../../../app/router';
import { useMediaQuery } from '../../../app/vue-bridge';
import LinkButton from '../LinkButton.vue';
import '@vielzeug/refine/button-group';

/**
 * The hunt's two fight boards: the glyphs carry the meaning, the labels ride the
 * buttons' accessible names, and the secondary bordered tone matches the switch
 * grammar the boards themselves wear. Every hunt surface (campaign quest and final
 * battle, expedition, ascent, Winds) passes its own board routes; a hunt with no
 * party hides the hunter board, a hunt with no monster hides the monster board.
 * On phones each board is its own circle, detached; on wider tiers they ride as
 * one joined icon pair.
 */
const { showHunterBoard = true, showMonsterBoard = true } = defineProps<{
  hunterBoardParams?: Record<string, string>;
  hunterBoardTo: RouteName;
  monsterBoardParams?: Record<string, string>;
  monsterBoardTo: RouteName;
  showHunterBoard?: boolean;
  showMonsterBoard?: boolean;
}>();

const isPhone = useMediaQuery('(width < 640px)');
</script>

<template>
  <!-- Phone: each board its own circle, floating beside the verdicts. -->
  <span class="hunt-controls--circles" v-if="isPhone" >
    <LinkButton color="secondary" icon-only rounded="full" variant="bordered" v-if="showHunterBoard"
      :label="t('boards.hunterBoard')" :params="hunterBoardParams" :to="hunterBoardTo">
      <span aria-hidden="true" class="board-glyph" style="--glyph: url(/icons/icon_hunter.svg)" />
    </LinkButton>
    <LinkButton color="secondary" icon-only rounded="full" variant="bordered" v-if="showMonsterBoard"
      :label="t('boards.monsterBoard')" :params="monsterBoardParams" :to="monsterBoardTo">
      <span aria-hidden="true" class="board-glyph" style="--glyph: url(/icons/icon_rampage.svg)" />
    </LinkButton>
  </span>
  <!-- Wider tiers: the joined icon pair. -->
  <ore-button-group attached variant="bordered" v-else >
    <LinkButton color="secondary" icon-only v-if="showHunterBoard" :label="t('boards.hunterBoard')"
      :params="hunterBoardParams" :to="hunterBoardTo">
      <span aria-hidden="true" class="board-glyph" style="--glyph: url(/icons/icon_hunter.svg)" />
    </LinkButton>
    <LinkButton color="secondary" icon-only v-if="showMonsterBoard" :label="t('boards.monsterBoard')"
      :params="monsterBoardParams" :to="monsterBoardTo">
      <span aria-hidden="true" class="board-glyph" style="--glyph: url(/icons/icon_rampage.svg)" />
    </LinkButton>
  </ore-button-group>
</template>

<style scoped>
/* Game glyphs masked in currentColor so they follow the button color in either theme. */
.board-glyph {
  display: inline-block;
  flex-shrink: 0;
  width: var(--size-4);
  height: var(--size-4);
  background: currentcolor;
  mask: var(--glyph) center / contain no-repeat;
}

/* Phone circles: the pair packs as tightly as the row's other circles. */
.hunt-controls--circles {
  display: inline-flex;
  gap: var(--size-2);
  align-items: center;
}
</style>
