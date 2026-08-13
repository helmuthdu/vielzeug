<script setup lang="ts">
import { useRoute, withBase } from 'vitepress';

import { PACKAGE_GROUPS } from './packageGroups';

defineProps<{ screenMenu?: boolean }>();

const route = useRoute();
const isCurrentPackage = (packageId: string): boolean =>
  route.path === `/${packageId}/` || route.path.startsWith(`/${packageId}/`);
const MENU_COLUMNS = [
  PACKAGE_GROUPS.slice(0, 2),
  PACKAGE_GROUPS.slice(2, 3),
  PACKAGE_GROUPS.slice(3, 5),
  PACKAGE_GROUPS.slice(5),
];
</script>

<template>
  <details v-if="screenMenu" class="screen-menu">
    <summary>Packages</summary>
    <div v-for="group in PACKAGE_GROUPS" :key="group.id" class="screen-group">
      <p>{{ group.name }}</p>
      <a
        v-for="pkg in group.packages"
        :key="pkg.id"
        :aria-current="isCurrentPackage(pkg.id) ? 'page' : undefined"
        :href="`/${pkg.id}/`">
        <img :src="withBase(`/logo-${pkg.id}.svg`)" alt="" class="screen-package-logo" />
        <span>{{ pkg.id }}</span>
      </a>
    </div>
    <a class="screen-all-packages" href="/#packages">Browse all packages</a>
  </details>

  <ore-navigation-menu v-else class="packages-menu" placement="bottom-start">
    <ore-navigation-menu-item value="packages">
      <span>Packages</span>
      <ore-icon name="chevron-down" size="14" stroke-width="2" aria-hidden="true"></ore-icon>
    </ore-navigation-menu-item>

    <ore-navigation-menu-panel for="packages">
      <div
        v-for="(column, index) in MENU_COLUMNS"
        :key="index"
        class="menu-column"
        :class="{ 'menu-column--separated': index > 0 }">
        <section v-for="group in column" :key="group.id" class="group">
          <p class="group-title">{{ group.name }}</p>
          <a
            v-for="pkg in group.packages"
            :key="pkg.id"
            class="package-link"
            :class="{ current: isCurrentPackage(pkg.id) }"
            :aria-current="isCurrentPackage(pkg.id) ? 'page' : undefined"
            :href="`/${pkg.id}/`">
            <img :src="withBase(`/logo-${pkg.id}.svg`)" alt="" class="package-logo" />
            <span class="package-copy">
              <span class="package-name">{{ pkg.id }}</span>
              <span class="package-tagline">{{ pkg.tagline }}</span>
            </span>
          </a>
        </section>
      </div>
      <a slot="footer" class="all-packages" href="/#packages">
        Browse all packages
        <ore-icon name="arrow-right" size="16" stroke-width="2" aria-hidden="true"></ore-icon>
      </a>
    </ore-navigation-menu-panel>
  </ore-navigation-menu>
</template>

<style scoped>
.packages-menu {
  display: inline-flex;
  --navigation-menu-panel-columns: 4;
  --navigation-menu-panel-max-height: calc(100dvh - var(--size-16));
  --navigation-menu-panel-width: 72rem;
}

ore-navigation-menu-panel::part(content) {
  align-content: start;
  align-items: start;
  gap: var(--size-7) var(--size-5);
  padding: var(--size-6);
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--size-1-5);
}

.menu-column {
  display: flex;
  flex-direction: column;
  gap: var(--size-7);
  min-width: 0;
}

.menu-column--separated {
  border-inline-start: var(--border) solid var(--color-divider);
  padding-inline-start: var(--size-5);
}

.group-title {
  margin: 0 0 var(--size-1);
  color: var(--color-contrast-500);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.package-link {
  display: flex;
  gap: var(--size-2);
  align-items: flex-start;
  padding: var(--size-2) var(--size-3);
  color: var(--color-contrast-700);
  text-decoration: none;
  border-radius: var(--rounded-md);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.package-logo {
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
  margin-block-start: var(--size-0-5);
}

.package-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--size-0-5);
  min-width: 0;
}

.package-link:hover,
.package-link:focus-visible,
.package-link.current {
  color: var(--color-primary);
  background: var(--color-contrast-100);
}

.package-link:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--size-0-5);
}

.package-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.package-tagline {
  font-size: var(--text-xs);
  color: var(--color-contrast-500);
}

.screen-menu {
  border-bottom: var(--border) solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.screen-menu summary {
  padding: var(--size-3) 0;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
}

.screen-group {
  display: grid;
  gap: var(--size-2);
  padding: var(--size-3) 0 var(--size-4) var(--size-4);
}

.screen-group p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.screen-group a {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  color: var(--vp-c-text-1);
  font-size: var(--text-sm);
  text-decoration: none;
}

.screen-package-logo {
  flex: none;
  width: 1rem;
  height: 1rem;
}

.screen-group a:hover,
.screen-group a:focus-visible,
.screen-group a[aria-current='page'] {
  color: var(--vp-c-brand-1);
}

.screen-all-packages {
  display: block;
  padding: var(--size-3) 0;
  color: var(--vp-c-brand-1);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-decoration: none;
}

@media (max-width: 1000px) {
  .packages-menu {
    --navigation-menu-panel-columns: 2;
    --navigation-menu-panel-width: 46rem;
  }

  .menu-column--separated {
    border-inline-start: 0;
    padding-inline-start: 0;
  }
}
</style>
