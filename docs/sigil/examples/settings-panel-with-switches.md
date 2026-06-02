---
title: 'Sigil Examples — Settings Panel with Switches'
description: 'Settings Panel with Switches examples for block.'
---

## Settings Panel with Switches

### Problem

You need a settings panel where each toggle takes effect immediately. The switch state must stay in sync with a reactive data model across React, Vue, and Svelte.

### Solution

Bind `checked` to your component's state and listen to the `change` event. Toggle switches are perfect for settings that take effect immediately.

::: code-group

```tsx [React]
import '@vielzeug/sigil/switch';
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
import '@vielzeug/sigil/switch';

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
  import '@vielzeug/sigil/switch';

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

### Related

- [Common Patterns](./common-patterns.md)
- [Guideline-Oriented Recipes](./guideline-oriented-recipes.md)
