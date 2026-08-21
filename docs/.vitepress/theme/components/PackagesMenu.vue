<script lang="ts" setup >
import { useRoute, withBase } from 'vitepress';

import { NAVBAR_COLUMNS, PACKAGE_GROUPS } from './packageGroups';

defineProps<{ screenMenu?: boolean }>();

const route = useRoute();
const isCurrentPackage = (packageId: string): boolean =>
  route.path === `/${packageId}/` || route.path.startsWith(`/${packageId}/`);
const MENU_COLUMNS = NAVBAR_COLUMNS;
</script>

<template>
  <details class="screen-menu" v-if="screenMenu" >
    <summary>Packages</summary>
    <div class="screen-group" v-for="group in PACKAGE_GROUPS" :key="group.id" >
      <p>{{ group.name }}</p>
      <a
        v-for="pkg in group.packages"
        :key="pkg.id"
        :aria-current="isCurrentPackage(pkg.id) ? 'page' : undefined"
        :href="`/${pkg.id}/`">
        <img alt="" class="screen-package-logo" :src="withBase(`/logo-${pkg.id}.svg`)" />
        <span>{{ pkg.id }}</span>
      </a>
    </div>
    <a class="screen-all-packages" href="/#packages">Browse all packages</a>
  </details>

  <ore-navigation-menu class="packages-menu" placement="bottom-start" v-else >
    <ore-navigation-menu-item value="packages">
      <span>Packages</span>
      <ore-icon aria-hidden="true" name="chevron-down" size="14" stroke-width="2" ></ore-icon>
    </ore-navigation-menu-item>

    <ore-navigation-menu-panel for="packages">
      <div
        class="menu-column"
        v-for="(column, index) in MENU_COLUMNS"
        :key="index"
        :class="{ 'menu-column--separated': index > 0 }">
        <section class="group" v-for="group in column" :key="group.id" >
          <p class="group-title">{{ group.name }}</p>
          <a
            class="package-link"
            v-for="pkg in group.packages"
            :key="pkg.id"
            :aria-current="isCurrentPackage(pkg.id) ? 'page' : undefined"
            :class="{ current: isCurrentPackage(pkg.id) }"
            :href="`/${pkg.id}/`">
            <img alt="" class="package-logo" :src="withBase(`/logo-${pkg.id}.svg`)" />
            <span class="package-copy">
              <span class="package-name">{{ pkg.id }}</span>
              <span class="package-tagline">{{ pkg.tagline }}</span>
            </span>
          </a>
        </section>
      </div>
      <a class="all-packages" href="/#packages" slot="footer" >
        Browse all packages
        <ore-icon aria-hidden="true" name="arrow-right" size="16" stroke-width="2" ></ore-icon>
      </a>
    </ore-navigation-menu-panel>
  </ore-navigation-menu>
</template>

<style scoped>
.packages-menu {
  --navigation-menu-panel-columns: 4;
  --navigation-menu-panel-max-height: calc(100dvh - var(--size-16));
  --navigation-menu-panel-width: 72rem;
  display: inline-flex;
}

ore-navigation-menu-panel::part(content) {
  gap: var(--size-7) var(--size-5);
  align-content: start;
  align-items: start;
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
  padding-inline-start: var(--size-5);
  border-inline-start: var(--border) solid var(--color-divider);
}

.group-title {
  margin: 0 0 var(--size-1);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-contrast-500);
  text-transform: uppercase;
  letter-spacing: 0.06em;
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
  color: var(--vp-c-text-1);
  border-bottom: var(--border) solid var(--vp-c-divider);
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
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.screen-group a {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  font-size: var(--text-sm);
  color: var(--vp-c-text-1);
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
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

@media (max-width: 1000px) {
  .packages-menu {
    --navigation-menu-panel-columns: 2;
    --navigation-menu-panel-width: 46rem;
  }

  .menu-column--separated {
    padding-inline-start: 0;
    border-inline-start: 0;
  }
}
</style>
