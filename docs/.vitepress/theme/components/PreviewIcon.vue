<script setup lang="ts">
defineProps<{ name: string; size?: number }>();
</script>

<template>
  <svg
    :width="size ?? 16"
    :height="size ?? 16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg">
    <!-- maximize -->
    <template v-if="name === 'maximize'">
      <path d="m15 3h6v6" />
      <path d="m21 3-7 7" />
      <path d="m3 21 7-7" />
      <path d="M9 21H3v-6" />
    </template>
    <!-- minimize -->
    <template v-else-if="name === 'minimize'">
      <path d="M14 10 21 3" />
      <path d="M20 10H14V4" />
      <path d="m3 21 7-7" />
      <path d="m4 14h6v6" />
    </template>
    <!-- mobile -->
    <template v-else-if="name === 'mobile'">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="m12 18h.01" />
    </template>
    <!-- tablet -->
    <template v-else-if="name === 'tablet'">
      <rect width="17.56" height="20" x="3.22" y="2" rx="2" ry="2" />
      <line x1="12" x2="12.01" y1="18" y2="18" />
    </template>
    <!-- desktop -->
    <template v-else-if="name === 'desktop'">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </template>
    <!-- copy -->
    <template v-else-if="name === 'copy'">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </template>
    <!-- check -->
    <template v-else-if="name === 'check'">
      <path d="M20 6 9 17l-5-5" />
    </template>
    <!-- edit (pencil) -->
    <template v-else-if="name === 'edit'">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </template>
  </svg>
</template>
