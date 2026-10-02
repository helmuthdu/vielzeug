<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../app/assets';
import { cardTokenIcons, coloredCardTokens } from '../../content';

/**
 * Card text with its bracketed references printed as the icons they stand for: "[stamina]"
 * renders as the stamina icon in the text's color, following the theme. The card-type references
 * "[attack]", "[maneuver]", "[parry]" and "[dodge]" print with their own colored art, untouched
 * by the theme. "[weapon]" prints the hero's weapon-class icon through `weaponIcon`; references
 * without art stay bracketed text, and "\n" breaks lines like the plain card texts do.
 */
const props = defineProps<{ text: string; weaponIcon?: string }>();

interface Segment {
  /** Colored icon path: the card-type tokens, which keep their printed colors. */
  colored?: string;
  /** Monochrome icon path, painted in the text's color. */
  icon?: string;
  /** The reference's name, kept as the icon's accessible label. */
  label?: string;
  /** Plain text between references. */
  text?: string;
}

/** Lines of segments: only mapped references split the text; unknown ones stay inside it. */
const lines = computed(() =>
  props.text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const segments: Segment[] = [];
      const pattern = /\[([a-z-]+)\]/g;
      let cursor = 0;
      for (const match of line.matchAll(pattern)) {
        const colored = coloredCardTokens[match[1]];
        // "[weapon]" is the hero's own weapon: the caller supplies its class icon.
        const icon = colored ? undefined : match[1] === 'weapon' ? props.weaponIcon : cardTokenIcons[match[1]];
        if (!colored && !icon) continue;
        if (match.index > cursor) segments.push({ text: line.slice(cursor, match.index) });
        segments.push(colored ? { colored, label: match[1] } : { icon, label: match[1] });
        cursor = match.index + match[0].length;
      }
      if (cursor < line.length) segments.push({ text: line.slice(cursor) });
      return segments;
    }),
);
</script>

<template>
  <span class="card-text" v-for="(line, lineIndex) in lines" :key="lineIndex">
    <template v-for="(segment, index) in line" :key="index">
      <img
        class="card-text__icon card-text__icon--colored"
        v-if="segment.colored"
        :alt="segment.label"
        :src="asset(segment.colored)" />
      <span
        class="card-text__icon card-text__icon--mono"
        role="img"
        v-else-if="segment.icon"
        :aria-label="segment.label"
        :style="{ '--icon': `url(${asset(segment.icon)})` }" />
      <template v-else>{{ segment.text }}</template>
    </template>
  </span>
</template>

<style scoped>
.card-text {
  display: block;
}

/* The em sizing is intrinsic: the icon replaces a word, so it must track the text around it. */
.card-text__icon {
  display: inline-block;
  width: 1.15em;
  height: 1.15em;
  vertical-align: -0.22em;
}

/* Mono tokens paint with the text color, so they follow the theme. */
.card-text__icon--mono {
  background: currentcolor;
  mask: var(--icon) center / contain no-repeat;
}

/* The card-type tokens carry their own colors: never recolored by theme or text. */
.card-text__icon--colored {
  object-fit: contain;
}
</style>
