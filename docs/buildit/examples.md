# Examples

Real-world examples and patterns for using Buildit components in your applications.

## Framework Integration Examples

### Basic Form with Loading State

::: code-group

```tsx [React]
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';
import { useState } from 'react';

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(/* credentials */);
    } catch (err) {
      setError('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <bit-input type="email" required placeholder="Email" />
      <bit-input type="password" required placeholder="Password" />

      {error && <div className="error">{error}</div>}

      <div className="button-group">
        <bit-button type="submit" variant="solid" color="primary" loading={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </bit-button>

        <bit-button type="button" variant="ghost" disabled={isLoading}>
          Cancel
        </bit-button>
      </div>
    </form>
  );
}
```

```vue [Vue]
<template>
  <form @submit.prevent="handleSubmit">
    <bit-input type="email" required placeholder="Email" />
    <bit-input type="password" required placeholder="Password" />

    <div v-if="error" class="error">{{ error }}</div>

    <div class="button-group">
      <bit-button type="submit" variant="solid" color="primary" :loading="isLoading">
        {{ isLoading ? 'Logging in...' : 'Login' }}
      </bit-button>

      <bit-button type="button" variant="ghost" :disabled="isLoading"> Cancel </bit-button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';

const isLoading = ref(false);
const error = ref('');

const handleSubmit = async () => {
  isLoading.value = true;
  error.value = '';

  try {
    await login(/* credentials */);
  } catch (err) {
    error.value = 'Login failed';
  } finally {
    isLoading.value = false;
  }
};
</script>
```

```svelte [Svelte]
<script lang="ts">
  import '@vielzeug/buildit/button';
  import '@vielzeug/buildit/input';

  let isLoading = false;
  let error = '';

  async function handleSubmit(e: Event) {
    e.preventDefault();
    isLoading = true;
    error = '';

    try {
      await login(/* credentials */);
    } catch (err) {
      error = 'Login failed';
    } finally {
      isLoading = false;
    }
  }
</script>

<form on:submit={handleSubmit}>
  <bit-input type="email" required placeholder="Email" />
  <bit-input type="password" required placeholder="Password" />

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="button-group">
    <bit-button
      type="submit"
      variant="solid"
      color="primary"
      loading={isLoading}>
      {isLoading ? 'Logging in...' : 'Login'}
    </bit-button>

    <bit-button
      type="button"
      variant="ghost"
      disabled={isLoading}>
      Cancel
    </bit-button>
  </div>
</form>
```

:::

### Custom Hooks and Composables

::: code-group

```tsx [React Hook]
import { useRef, useEffect } from 'react';

function useButtonClick(callback: () => void) {
  const buttonRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleClick = (e: Event) => {
      callback();
    };

    button.addEventListener('click', handleClick);
    return () => button.removeEventListener('click', handleClick);
  }, [callback]);

  return buttonRef;
}

// Usage
function App() {
  const buttonRef = useButtonClick(() => {
    console.log('Button clicked!');
  });

  return <bit-button ref={buttonRef}>Click me</bit-button>;
}
```

```typescript [Vue Composable]
// useButton.ts
import { ref } from 'vue';

export function useButton() {
  const isLoading = ref(false);
  const isDisabled = ref(false);

  const withLoading = async (fn: () => Promise<void>) => {
    isLoading.value = true;
    isDisabled.value = true;

    try {
      await fn();
    } finally {
      isLoading.value = false;
      isDisabled.value = false;
    }
  };

  return {
    isLoading,
    isDisabled,
    withLoading,
  };
}

// Component.vue
// <template>
//   <bit-button
//     :loading="isLoading"
//     :disabled="isDisabled"
//     @click="handleSubmit">
//     Submit
//   </bit-button>
// </template>
//
// <script setup>
// import { useButton } from './useButton';
//
// const { isLoading, isDisabled, withLoading } = useButton();
//
// const handleSubmit = () => {
//   withLoading(async () => {
//     await submitForm();
//   });
// };
// </script>
```

```typescript [Svelte Store]
// buttonStore.ts
import { writable } from 'svelte/store';

export const buttonState = writable({
  loading: false,
  disabled: false,
  variant: 'solid' as const,
  color: 'primary' as const,
});

export function withLoading(fn: () => Promise<void>) {
  buttonState.update((state) => ({
    ...state,
    loading: true,
    disabled: true,
  }));

  return fn().finally(() => {
    buttonState.update((state) => ({
      ...state,
      loading: false,
      disabled: false,
    }));
  });
}

// Component usage:
// <script>
//   import { buttonState, withLoading } from './buttonStore';
//
//   function handleClick() {
//     withLoading(async () => {
//       await submitData();
//     });
//   }
// </script>
//
// <bit-button
//   variant={$buttonState.variant}
//   color={$buttonState.color}
//   loading={$buttonState.loading}
//   disabled={$buttonState.disabled}
//   on:click={handleClick}>
//   Submit
// </bit-button>
```

:::

## Common Patterns

### Form Actions

<ComponentPreview>

```html
<form id="userForm">
  <bit-input type="text" name="username" placeholder="Username" required></bit-input>
  <bit-input type="email" name="email" placeholder="Email" required></bit-input>

  <div class="form-actions" style="display: flex; gap: 0.75rem; margin-top: 1rem;">
    <bit-button type="submit" variant="solid" color="success"> Save </bit-button>

    <bit-button type="reset" variant="outline" color="secondary"> Reset </bit-button>

    <bit-button type="button" variant="ghost" color="error"> Delete </bit-button>
  </div>
</form>
```

</ComponentPreview>

### Confirmation Dialog

<ComponentPreview>

```html
<div style="padding: 1.5rem; border: 1px solid var(--color-contrast-300); border-radius: 0.5rem; max-width: 400px;">
  <h2 style="margin: 0 0 0.5rem 0; font-size: var(--text-lg);">Confirm Delete</h2>
  <p style="margin: 0 0 1.5rem 0; color: var(--text-color-secondary);">Are you sure you want to delete this item?</p>

  <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
    <bit-button variant="ghost" color="secondary"> Cancel </bit-button>

    <bit-button variant="solid" color="error"> Delete </bit-button>
  </div>
</div>
```

</ComponentPreview>

### Pagination

<ComponentPreview>

```html
<div style="display: flex; align-items: center; gap: 0.5rem;">
  <bit-button variant="ghost" size="sm" disabled> Previous </bit-button>

  <bit-button variant="text" size="sm">1</bit-button>
  <bit-button variant="solid" size="sm">2</bit-button>
  <bit-button variant="text" size="sm">3</bit-button>
  <bit-button variant="text" size="sm">...</bit-button>
  <bit-button variant="text" size="sm">10</bit-button>

  <bit-button variant="ghost" size="sm"> Next </bit-button>
</div>
```

</ComponentPreview>

### Toolbar

<ComponentPreview>

```html
<div
  style="display: flex; gap: 0.25rem; padding: 0.5rem; background: var(--color-contrast-100); border-radius: 0.375rem;">
  <bit-button variant="ghost" size="sm" icon-only aria-label="Bold">
    <strong>B</strong>
  </bit-button>

  <bit-button variant="ghost" size="sm" icon-only aria-label="Italic">
    <em>I</em>
  </bit-button>

  <bit-button variant="ghost" size="sm" icon-only aria-label="Underline">
    <u>U</u>
  </bit-button>

  <div style="width: 1px; background: var(--color-contrast-300); margin: 0 0.25rem;"></div>

  <bit-button variant="ghost" size="sm" icon-only aria-label="Link"> 🔗 </bit-button>
</div>
```

</ComponentPreview>

### Loading States

<ComponentPreview>

```html
<div style="display: flex; gap: 0.75rem;">
  <bit-button variant="solid" color="primary"> Normal </bit-button>

  <bit-button variant="solid" color="primary" loading> Loading... </bit-button>

  <bit-button variant="solid" color="primary" disabled> Disabled </bit-button>
</div>
```

</ComponentPreview>

### Button Group

<ComponentPreview>

```html
<bit-button-group attached>
  <bit-button variant="bordered">Day</bit-button>
  <bit-button variant="solid">Week</bit-button>
  <bit-button variant="bordered">Month</bit-button>
</bit-button-group>
```

</ComponentPreview>

## Advanced Examples

### Debounced Button

```typescript
function createDebouncedButton(selector: string, delay = 300) {
  const button = document.querySelector(selector) as HTMLElement;
  let timeoutId: number;

  button?.addEventListener('click', (e) => {
    e.preventDefault();

    clearTimeout(timeoutId);
    button.setAttribute('disabled', '');

    timeoutId = window.setTimeout(() => {
      button.removeAttribute('disabled');
      // Perform action
      handleAction();
    }, delay);
  });
}

// Usage
createDebouncedButton('#submitBtn', 500);
```

### Progress Indicator

<ComponentPreview vertical>

```html
<div style="max-width: 300px;">
  <bit-button id="uploadBtn" variant="solid" color="primary" style="width: 100%;"> Upload File </bit-button>

  <div id="progressContainer" style="display: none; margin-top: 1rem;">
    <progress id="progressBar" value="0" max="100" style="width: 100%; height: 8px;"></progress>
    <div
      id="progressText"
      style="text-align: center; margin-top: 0.5rem; font-size: var(--text-sm); color: var(--text-color-secondary);">
      0%
    </div>
  </div>
</div>

<script>
  const button = document.getElementById('uploadBtn');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  button.addEventListener('click', async () => {
    button.style.display = 'none';
    progressContainer.style.display = 'block';

    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      progressBar.value = i;
      progressText.textContent = i + '%';
    }

    progressContainer.style.display = 'none';
    button.style.display = 'block';
  });
</script>
```

</ComponentPreview>

### Keyboard Shortcuts

<ComponentPreview>

```html
<bit-button id="saveBtn" variant="solid" color="primary">
  Save
  <span slot="suffix" style="opacity: 0.6; font-size: 0.875em; margin-left: 0.5rem;"> Ctrl+S </span>
</bit-button>

<script>
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      document.getElementById('saveBtn').click();
      console.log('Saved via keyboard shortcut!');
    }
  });
</script>
```

</ComponentPreview>

## Theming Examples

### Custom Theme Variables

```css
/* Custom brand theme */
:root {
  --color-primary: #8b5cf6;
  --color-primary-contrast: #ffffff;
  --color-primary-focus: #7c3aed;

  --color-secondary: #64748b;
  --color-secondary-contrast: #ffffff;
  --color-secondary-focus: #475569;
}

/* Apply to all buttons */
bit-button {
  --button-font-weight: 600;
  --button-radius: 0.5rem;
  --button-padding: 0.625rem 1.25rem;
}

/* Specific variant customization */
bit-button[variant='solid'] {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

bit-button[variant='solid']:hover {
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}
```

### Theme Customization Example

<ComponentPreview>

```html
<div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
  <bit-button
    variant="solid"
    style="--button-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%); --button-color: white; --button-radius: 20px;">
    Gradient Button
  </bit-button>

  <bit-button
    variant="solid"
    style="--button-bg: #ff6b6b; --button-color: white; --button-padding: 0.75rem 2rem; --button-font-weight: 700;">
    Custom Padding
  </bit-button>

  <bit-button
    variant="outline"
    style="--button-border-color: #8b5cf6; --button-color: #8b5cf6; --button-hover-bg: rgba(139, 92, 246, 0.1);">
    Purple Outline
  </bit-button>
</div>
```

</ComponentPreview>

### Dynamic Theme Switcher

```typescript
function applyTheme(themeName: string) {
  const themes = {
    ocean: {
      '--color-primary': '#0ea5e9',
      '--color-primary-contrast': '#ffffff',
      '--color-primary-focus': '#0284c7',
      '--color-success': '#06b6d4',
      '--color-error': '#f43f5e',
    },
    forest: {
      '--color-primary': '#059669',
      '--color-primary-contrast': '#ffffff',
      '--color-primary-focus': '#047857',
      '--color-success': '#10b981',
      '--color-error': '#dc2626',
    },
    sunset: {
      '--color-primary': '#f97316',
      '--color-primary-contrast': '#ffffff',
      '--color-primary-focus': '#ea580c',
      '--color-success': '#facc15',
      '--color-error': '#dc2626',
    },
  };

  const theme = themes[themeName];
  if (theme) {
    Object.entries(theme).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }
}

// Usage
applyTheme('ocean');
```

## Testing Examples

### Unit Testing with Vitest

::: code-group

```typescript [Basic Tests]
import { expect, test, describe } from 'vitest';
import { createFixture } from '@vielzeug/craftit/testing';

describe('bit-button', () => {
  test('renders correctly', async () => {
    const fixture = await createFixture('bit-button');
    fixture.element.textContent = 'Test Button';

    const button = fixture.query('button');
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain('Test Button');

    fixture.destroy();
  });

  test('handles click events', async () => {
    const fixture = await createFixture('bit-button');
    const clickHandler = vi.fn();

    fixture.element.addEventListener('click', clickHandler);
    fixture.query('button')?.click();

    expect(clickHandler).toHaveBeenCalled();
    fixture.destroy();
  });

  test('shows loading state', async () => {
    const fixture = await createFixture('bit-button', { loading: true });

    expect(fixture.element.hasAttribute('loading')).toBe(true);
    expect(fixture.query('.spinner')).toBeTruthy();

    fixture.destroy();
  });
});
```

```typescript [Input Tests]
import { expect, test, describe } from 'vitest';
import { createFixture } from '@vielzeug/craftit/testing';

describe('bit-input', () => {
  test('updates value on input', async () => {
    const fixture = await createFixture('bit-input', {
      type: 'text',
      placeholder: 'Enter text',
    });

    const input = fixture.query('input') as HTMLInputElement;
    input.value = 'test value';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(fixture.element.getAttribute('value')).toBe('test value');
    fixture.destroy();
  });

  test('emits change event with details', async () => {
    const fixture = await createFixture('bit-input');
    const changeHandler = vi.fn();

    fixture.element.addEventListener('change', changeHandler);

    const input = fixture.query('input') as HTMLInputElement;
    input.value = 'new value';
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(changeHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          value: 'new value',
        }),
      }),
    );

    fixture.destroy();
  });
});
```

:::

### E2E Testing with Playwright

::: code-group

```typescript [Button Tests]
import { test, expect } from '@playwright/test';

test.describe('Button Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/button');
  });

  test('renders and is interactive', async ({ page }) => {
    const button = page.locator('bit-button').first();

    await expect(button).toBeVisible();
    await expect(button).not.toBeDisabled();

    await button.click();

    // Verify click worked
    await expect(page.locator('.result')).toContainText('Clicked');
  });

  test('handles loading state', async ({ page }) => {
    const button = page.locator('bit-button#async-button');

    await button.click();

    // Should show loading state
    await expect(button).toHaveAttribute('loading');
    await expect(button).toBeDisabled();

    // Wait for loading to complete
    await expect(button).not.toHaveAttribute('loading', { timeout: 5000 });
    await expect(button).not.toBeDisabled();
  });

  test('keyboard navigation works', async ({ page }) => {
    const button = page.locator('bit-button').first();

    await button.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('.result')).toContainText('Clicked');
  });
});
```

```typescript [Form Tests]
import { test, expect } from '@playwright/test';

test.describe('Form Integration', () => {
  test('submits form with input values', async ({ page }) => {
    await page.goto('/examples/form');

    // Fill in form
    await page.locator('bit-input[name="email"]').fill('test@example.com');
    await page.locator('bit-input[name="password"]').fill('password123');

    // Submit
    await page.locator('bit-button[type="submit"]').click();

    // Check submission
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('validates required fields', async ({ page }) => {
    await page.goto('/examples/form');

    // Try to submit without filling
    await page.locator('bit-button[type="submit"]').click();

    // Should show validation errors
    const emailInput = page.locator('bit-input[name="email"]');
    await expect(emailInput).toHaveAttribute('color', 'error');
  });
});
```

:::

## Accordion Examples

### FAQ Section

<ComponentPreview vertical>

```html
<bit-accordion variant="bordered" selection-mode="single">
  <bit-accordion-item expanded>
    <span slot="title">What is Buildit?</span>
    <p>
      Buildit is a modern, accessible UI component library built with web components. It provides framework-agnostic
      components that work with React, Vue, Svelte, or vanilla JavaScript.
    </p>
  </bit-accordion-item>

  <bit-accordion-item>
    <span slot="title">How do I install Buildit?</span>
    <div>
      <p>Install Buildit using your preferred package manager:</p>
      <pre
        style="background: var(--color-contrast-100); padding: 0.75rem; border-radius: 0.375rem; margin-top: 0.5rem;"><code>pnpm add @vielzeug/buildit</code></pre>
    </div>
  </bit-accordion-item>

  <bit-accordion-item>
    <span slot="title">Is it accessible?</span>
    <p>
      Yes! All Buildit components follow WCAG 2.1 Level AA guidelines with full keyboard navigation, screen reader
      support, proper ARIA attributes, and focus management.
    </p>
  </bit-accordion-item>
</bit-accordion>
```

</ComponentPreview>

### Settings Panel with Framework Integration

::: code-group

```tsx [React]
import '@vielzeug/buildit/accordion';
import '@vielzeug/buildit/accordion-item';
import '@vielzeug/buildit/checkbox';
import { useState } from 'react';

interface Settings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsAlerts: boolean;
}

function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>({
    emailNotifications: true,
    pushNotifications: false,
    smsAlerts: true,
  });

  const handleToggle = (key: keyof Settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <bit-accordion variant="bordered">
      <bit-accordion-item expanded>
        <span slot="title">🔔 Notifications</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <bit-checkbox checked={settings.emailNotifications} onChange={() => handleToggle('emailNotifications')}>
            Email notifications
          </bit-checkbox>
          <bit-checkbox checked={settings.pushNotifications} onChange={() => handleToggle('pushNotifications')}>
            Push notifications
          </bit-checkbox>
          <bit-checkbox checked={settings.smsAlerts} onChange={() => handleToggle('smsAlerts')}>
            SMS alerts
          </bit-checkbox>
        </div>
      </bit-accordion-item>
    </bit-accordion>
  );
}
```

```vue [Vue]
<template>
  <bit-accordion variant="bordered">
    <bit-accordion-item expanded>
      <span slot="title">🔔 Notifications</span>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <bit-checkbox :checked="settings.emailNotifications" @change="handleToggle('emailNotifications')">
          Email notifications
        </bit-checkbox>
        <bit-checkbox :checked="settings.pushNotifications" @change="handleToggle('pushNotifications')">
          Push notifications
        </bit-checkbox>
        <bit-checkbox :checked="settings.smsAlerts" @change="handleToggle('smsAlerts')"> SMS alerts </bit-checkbox>
      </div>
    </bit-accordion-item>
  </bit-accordion>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import '@vielzeug/buildit/accordion';
import '@vielzeug/buildit/accordion-item';
import '@vielzeug/buildit/checkbox';

const settings = ref({
  emailNotifications: true,
  pushNotifications: false,
  smsAlerts: true,
});

const handleToggle = (key: string) => {
  settings.value[key] = !settings.value[key];
};
</script>
```

```svelte [Svelte]
<script lang="ts">
  import '@vielzeug/buildit/accordion';
  import '@vielzeug/buildit/accordion-item';
  import '@vielzeug/buildit/checkbox';

  let settings = {
    emailNotifications: true,
    pushNotifications: false,
    smsAlerts: true,
  };

  function handleToggle(key: string) {
    settings = {
      ...settings,
      [key]: !settings[key],
    };
  }
</script>

<bit-accordion variant="bordered">
  <bit-accordion-item expanded>
    <span slot="title">🔔 Notifications</span>
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <bit-checkbox
        checked={settings.emailNotifications}
        on:change={() => handleToggle('emailNotifications')}>
        Email notifications
      </bit-checkbox>
      <bit-checkbox
        checked={settings.pushNotifications}
        on:change={() => handleToggle('pushNotifications')}>
        Push notifications
      </bit-checkbox>
      <bit-checkbox
        checked={settings.smsAlerts}
        on:change={() => handleToggle('smsAlerts')}>
        SMS alerts
      </bit-checkbox>
    </div>
  </bit-accordion-item>
</bit-accordion>
```

:::

### Product Features

<ComponentPreview vertical>

```html
<bit-accordion variant="ghost">
  <bit-accordion-item>
    <span slot="title">
      <span style="font-size: 1.5em; margin-right: 0.5rem;">⚡</span>
      Lightning Fast
    </span>
    <div style="padding: 1rem 0;">
      <p>Built with performance in mind, our components are optimized for speed.</p>
      <ul style="margin: 1rem 0; padding-left: 1.5rem;">
        <li>Minimal bundle size</li>
        <li>Tree-shakeable imports</li>
        <li>Zero runtime dependencies</li>
      </ul>
      <bit-button variant="outline" size="sm">Learn More</bit-button>
    </div>
  </bit-accordion-item>

  <bit-accordion-item>
    <span slot="title">
      <span style="font-size: 1.5em; margin-right: 0.5rem;">♿</span>
      Fully Accessible
    </span>
    <div style="padding: 1rem 0;">
      <p>WCAG 2.1 Level AA compliant components for everyone.</p>
      <ul style="margin: 1rem 0; padding-left: 1.5rem;">
        <li>Keyboard navigation</li>
        <li>Screen reader support</li>
        <li>ARIA attributes</li>
      </ul>
      <bit-button variant="outline" size="sm">Learn More</bit-button>
    </div>
  </bit-accordion-item>
</bit-accordion>
```

</ComponentPreview>

## Next Steps

- **[API Reference](./api.md)** – Complete API documentation
- **[Usage Guide](./usage.md)** – Installation and usage
- **[Button Component](components/button.md)** – Detailed button documentation
- **[Accordion Component](components/accordion.md)** – Detailed accordion documentation
- **[Switch Component](components/switch.md)** – Detailed switch documentation

## Settings Panel with Switches

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
