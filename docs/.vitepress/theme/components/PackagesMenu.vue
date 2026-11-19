<script lang="ts" setup>
import { useRoute, withBase } from 'vitepress';

import { PACKAGE_GROUPS } from './packageGroups';

defineProps<{ menu?: boolean; screenMenu?: boolean }>();

const route = useRoute();
const isCurrentPackage = (packageId: string): boolean =>
  route.path === `/${packageId}/` || route.path.startsWith(`/${packageId}/`);
</script>

<template>
  <li class="menu-package-link" v-if="menu">
    <a href="/#packages">Packages</a>
  </li>

  <ore-navigation-menu
    class="packages-menu"
    placement="bottom-start"
    v-else
    :class="{ 'packages-menu--inline': screenMenu }"
    :inline="screenMenu">
    <ore-navigation-menu-item value="packages">
      Packages
    </ore-navigation-menu-item>

    <ore-navigation-menu-panel for="packages">
      <section class="group" v-for="group in PACKAGE_GROUPS" :key="group.id">
        <p class="group-title">{{ group.name }}</p>
        <ore-navigation-menu-link
            class="package-link"
            v-for="pkg in group.packages"
            :key="pkg.id"
            :active="isCurrentPackage(pkg.id)"
            :href="`/${pkg.id}/`">
          <img alt="" class="package-logo" :src="withBase(`/logo-${pkg.id}.svg`)" />
          <span class="package-copy">
            <span class="package-name">{{ pkg.id }}</span>
            <span class="package-tagline">{{ pkg.tagline }}</span>
          </span>
        </ore-navigation-menu-link>
      </section>
      <ore-navigation-menu-link class="all-packages" href="/#packages" slot="footer">
        Browse all packages
        <ore-icon aria-hidden="true" name="arrow-right" size="16" stroke-width="2"></ore-icon>
      </ore-navigation-menu-link>
    </ore-navigation-menu-panel>
  </ore-navigation-menu>
</template>

<style scoped>
.packages-menu {
  --navigation-menu-panel-columns: 4;
  --navigation-menu-panel-max-height: calc(100dvh - var(--size-16));
  --navigation-menu-panel-width: 72rem;
  --navbar-item-color: var(--vp-c-text-1);
  --navigation-menu-border-color: var(--vp-c-divider);
  --navigation-menu-radius: var(--rounded-xl);
  --navigation-menu-shadow: var(--vp-shadow-3);
  display: inline-flex;
  height: 100%;
}

.packages-menu--inline {
  display: block;
  height: auto;
}

ore-navigation-menu-panel::part(content) {
  gap: var(--size-7) var(--size-5);
  align-content: start;
  align-items: start;
  padding: var(--size-6);
}

ore-navigation-menu-panel[data-inline]::part(content) {
  gap: var(--size-3);
  padding: var(--size-3) 0;
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--size-1-5);
  min-width: 0;
}

.group-title {
  margin: 0 0 var(--size-1);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-contrast-500);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.package-link::part(link) {
  gap: var(--size-2);
  align-items: flex-start;
  padding: var(--size-2) var(--size-3);
  color: var(--color-contrast-700);
}

.package-logo {
  flex: none;
  width: var(--size-5);
  height: var(--size-5);
  margin-block-start: var(--size-0-5);
}

.package-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--size-0-5);
  min-width: 0;
}

.package-link:hover::part(link),
.package-link:focus-visible::part(link),
.package-link[active]::part(link) {
  color: var(--color-primary);
}

.package-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.package-tagline {
  font-size: var(--text-xs);
  color: var(--color-contrast-500);
  overflow-wrap: anywhere;
  white-space: normal;
}

.all-packages::part(link) {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
  padding: var(--size-3) var(--size-5);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--vp-c-brand-1);
  border-top: var(--border) solid var(--vp-c-divider);
}

.all-packages:hover::part(link),
.all-packages:focus-visible::part(link) {
  background: var(--vp-c-default-soft);
}

.menu-package-link a {
  display: block;
  padding: 0 var(--size-3);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: 2.2857143;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  text-decoration: none;
  border-radius: var(--rounded-md);
}

.menu-package-link a:hover,
.menu-package-link a:focus-visible {
  color: var(--vp-c-brand-1);
}

@media (max-width: 1000px) {
  .packages-menu {
    --navigation-menu-panel-columns: 2;
    --navigation-menu-panel-width: 46rem;
  }
}
</style>
