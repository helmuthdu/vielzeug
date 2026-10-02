<script lang="ts" setup>
import { asset } from '../../app/assets';

defineProps<{
  defeatImages?: readonly string[];
  defeated?: boolean;
  final?: boolean;
  image?: string;
}>();
</script>

<template>
  <header class="result-hero" :class="{ 'result-hero--defeat': defeated }">
    <div class="result-copy stack" style="--stack-gap: 0.6rem">
      <slot />
    </div>
    <div aria-hidden="true" class="result-hero__art">
      <div class="result-hero__defeat-art" v-if="defeatImages?.length">
        <img alt="" v-for="background in defeatImages" :key="background" :src="asset(background)" />
      </div>
      <img
        alt=""
        class="result-hero__image"
        v-else-if="image"
        :class="defeated ? 'result-hero__defeat-image' : final ? 'result-hero__final-art' : 'result-hero__victory-art'"
        :src="asset(image)" />
    </div>
  </header>
</template>

<style scoped>
.result-hero {
  position: relative;
  display: grid;
  min-height: 20rem;
  overflow: hidden;
  background: var(--color-info-backdrop);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
  isolation: isolate;
}

.result-hero--defeat {
  background: light-dark(var(--color-primary-backdrop), var(--color-error-backdrop));
}

.result-hero:has(.result-hero__final-art, .result-hero__defeat-image) {
  background: var(--p-panel);
}

.result-hero::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  content: '';
  background: linear-gradient(
    90deg,
    var(--p-panel) 0%,
    color-mix(in oklch, var(--p-panel) 96%, transparent) 42%,
    color-mix(in oklch, var(--p-panel) 72%, transparent) 58%,
    transparent 82%
  );
}

.result-copy {
  position: relative;
  z-index: 2;
  align-content: center;
  width: min(58%, 42rem);
  padding: clamp(1.5rem, 4vw, 3rem);
}

.result-hero__art {
  position: absolute;
  inset: 0 0 0 36%;
  z-index: 0;
  overflow: hidden;
  background: var(--color-neutral-50);
}

.result-hero__art:has(.result-hero__final-art, .result-hero__defeat-image) {
  -webkit-mask-image: linear-gradient(90deg, transparent, black 55%);
  mask-image: linear-gradient(90deg, transparent, black 55%);
}

.result-hero__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.94;
}

.result-hero__victory-art {
  filter: grayscale(1) contrast(0.94);
}

.result-hero__final-art {
  opacity: 1;
}

.result-hero__defeat-art,
.result-hero__defeat-art img {
  position: absolute;
}

.result-hero__defeat-art {
  inset: 0;
}

.result-hero__defeat-art img {
  bottom: 0;
  width: 56%;
  height: 80%;
  object-fit: contain;
  object-position: center bottom;
  opacity: 0.68;
  filter: sepia(1) saturate(0.62) contrast(0.92);
}

.result-hero__defeat-art img:nth-child(1) {
  right: -10%;
  z-index: 2;
}

.result-hero__defeat-art img:nth-child(2) {
  right: 18%;
  z-index: 1;
}

.result-hero__defeat-art img:nth-child(3) {
  bottom: 0;
  left: -8%;
  z-index: 0;
}

@media (width < 760px) {
  .result-hero {
    min-height: 29rem;
  }

  .result-hero::after {
    background: linear-gradient(
      180deg,
      transparent 0%,
      color-mix(in oklch, var(--p-panel) 58%, transparent) 36%,
      var(--p-panel) 58%
    );
  }

  .result-copy {
    box-sizing: border-box;
    align-content: end;
    width: 100%;
    padding-top: 14rem;
    text-align: left;
  }

  .result-hero__art {
    inset: 0 0 auto;
    height: 17rem;
  }

  .result-hero__art:has(.result-hero__final-art, .result-hero__defeat-image) {
    -webkit-mask-image: linear-gradient(180deg, black 40%, transparent);
    mask-image: linear-gradient(180deg, black 40%, transparent);
  }

  .result-hero__defeat-art img {
    width: 60%;
    height: 90%;
    object-fit: contain;
    opacity: 0.68;
  }

  .result-hero__defeat-art img:nth-child(1) {
    right: -15%;
  }

  .result-hero__defeat-art img:nth-child(2) {
    right: 13%;
  }

  .result-hero__defeat-art img:nth-child(3) {
    left: -15%;
  }
}
</style>
