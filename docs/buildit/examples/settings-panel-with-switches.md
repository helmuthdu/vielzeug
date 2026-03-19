---
title: 'Buildit Examples — Settings Panel with Switches'
description: 'Settings Panel with Switches examples for buildit.'
---

## Settings Panel with Switches

## Problem

Implement settings panel with switches in a production-friendly way with `@vielzeug/buildit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/buildit` installed.

Toggle switches are perfect for settings that take effect immediately.

::: code-group

```tsx [React]
import '@vielzeug/buildit/switch';
import { useState } from 'react';

function SettingsPanel() {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    autoSave: true,
    analytics: false,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="settings-panel">
      <h3>Application Settings</h3>

      <div className="setting-item">
        <bit-switch checked={settings.notifications} onChange={() => handleToggle('notifications')} color="primary">
          Enable notifications
        </bit-switch>
      </div>

      <div className="setting-item">
        <bit-switch checked={settings.darkMode} onChange={() => handleToggle('darkMode')} color="secondary">
          Dark mode
        </bit-switch>
      </div>

      <div className="setting-item">
        <bit-switch checked={settings.autoSave} onChange={() => handleToggle('autoSave')} color="success">
          Auto-save documents
        </bit-switch>
      </div>

      <div className="setting-item">
        <bit-switch checked={settings.analytics} onChange={() => handleToggle('analytics')} color="warning">
          Share analytics data
        </bit-switch>
      </div>
    </div>
  );
}
```

```vue [Vue]
<template>
  <div class="settings-panel">
    <h3>Application Settings</h3>

    <div class="setting-item">
      <bit-switch :checked="settings.notifications" @change="handleToggle('notifications')" color="primary">
        Enable notifications
      </bit-switch>
    </div>

    <div class="setting-item">
      <bit-switch :checked="settings.darkMode" @change="handleToggle('darkMode')" color="secondary">
        Dark mode
      </bit-switch>
    </div>

    <div class="setting-item">
      <bit-switch :checked="settings.autoSave" @change="handleToggle('autoSave')" color="success">
        Auto-save documents
      </bit-switch>
    </div>

    <div class="setting-item">
      <bit-switch :checked="settings.analytics" @change="handleToggle('analytics')" color="warning">
        Share analytics data
      </bit-switch>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import '@vielzeug/buildit/switch';

const settings = reactive({
  notifications: true,
  darkMode: false,
  autoSave: true,
  analytics: false,
});

const handleToggle = (key: keyof typeof settings) => {
  settings[key] = !settings[key];
};
</script>
```

```svelte [Svelte]
<script>
  import '@vielzeug/buildit/switch';

  let settings = {
    notifications: true,
    darkMode: false,
    autoSave: true,
    analytics: false,
  };

  function handleToggle(key) {
    settings = {
      ...settings,
      [key]: !settings[key],
    };
  }
</script>

<div class="settings-panel">
  <h3>Application Settings</h3>

  <div class="setting-item">
    <bit-switch
      checked={settings.notifications}
      on:change={() => handleToggle('notifications')}
      color="primary">
      Enable notifications
    </bit-switch>
  </div>

  <div class="setting-item">
    <bit-switch
      checked={settings.darkMode}
      on:change={() => handleToggle('darkMode')}
      color="secondary">
      Dark mode
    </bit-switch>
  </div>

  <div class="setting-item">
    <bit-switch
      checked={settings.autoSave}
      on:change={() => handleToggle('autoSave')}
      color="success">
      Auto-save documents
    </bit-switch>
  </div>

  <div class="setting-item">
    <bit-switch
      checked={settings.analytics}
      on:change={() => handleToggle('analytics')}
      color="warning">
      Share analytics data
    </bit-switch>
  </div>
</div>

<style>
  .settings-panel {
    max-width: 400px;
    padding: 1.5rem;
    background: var(--color-canvas);
    border-radius: 0.5rem;
    box-shadow: var(--shadow-md);
  }

  .setting-item {
    padding: 1rem 0;
    border-bottom: 1px solid var(--color-backdrop);
  }

  .setting-item:last-child {
    border-bottom: none;
  }
</style>
```

:::

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Common Patterns](./common-patterns.md)
- [Guideline-Oriented Recipes](./guideline-oriented-recipes.md)
