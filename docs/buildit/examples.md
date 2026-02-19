# Examples

Real-world examples and patterns for using Buildit components in your applications.

## Framework Integration Examples

### React Integration

#### Basic Usage

```tsx
import '@vielzeug/buildit/button';
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
      <input type="email" required />
      <input type="password" required />
      
      {error && <div className="error">{error}</div>}
      
      <div className="button-group">
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
  );
}
```

#### Custom Hook

```tsx
import { useRef, useEffect } from 'react';

function useButtonClick(callback: () => void) {
  const buttonRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleClick = (e: Event) => {
      const customEvent = e as CustomEvent;
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

### Vue Integration

#### Composition API

```vue
<template>
  <div>
    <bit-button
      :variant="variant"
      :color="color"
      :size="size"
      :loading="isLoading"
      :disabled="isDisabled"
      @click="handleClick">
      {{ buttonText }}
    </bit-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import '@vielzeug/buildit/button';

const isLoading = ref(false);
const isDisabled = ref(false);
const variant = ref('solid');
const color = ref('primary');
const size = ref('md');

const buttonText = computed(() => 
  isLoading.value ? 'Processing...' : 'Submit'
);

const handleClick = async () => {
  isLoading.value = true;
  
  try {
    await performAction();
  } finally {
    isLoading.value = false;
  }
};
</script>
```

#### Composable

```typescript
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
<template>
  <bit-button
    :loading="isLoading"
    :disabled="isDisabled"
    @click="handleSubmit">
    Submit
  </bit-button>
</template>

<script setup>
import { useButton } from './useButton';

const { isLoading, isDisabled, withLoading } = useButton();

const handleSubmit = () => {
  withLoading(async () => {
    await submitForm();
  });
};
</script>
```

### Svelte Integration

#### Basic Usage

```svelte
<script lang="ts">
  import '@vielzeug/buildit/button';
  
  let loading = false;
  let disabled = false;
  
  async function handleClick() {
    loading = true;
    disabled = true;
    
    try {
      await performAction();
    } finally {
      loading = false;
      disabled = false;
    }
  }
</script>

<bit-button
  variant="solid"
  color="primary"
  {loading}
  {disabled}
  on:click={handleClick}>
  {loading ? 'Loading...' : 'Click me'}
</bit-button>
```

#### Store Integration

```typescript
// buttonStore.ts
import { writable } from 'svelte/store';

export const buttonState = writable({
  loading: false,
  disabled: false,
  variant: 'solid' as const,
  color: 'primary' as const,
});

export function withLoading(fn: () => Promise<void>) {
  buttonState.update(state => ({
    ...state,
    loading: true,
    disabled: true,
  }));

  return fn().finally(() => {
    buttonState.update(state => ({
      ...state,
      loading: false,
      disabled: false,
    }));
  });
}
```

```svelte
<script>
  import { buttonState, withLoading } from './buttonStore';
  
  function handleClick() {
    withLoading(async () => {
      await submitData();
    });
  }
</script>

<bit-button
  variant={$buttonState.variant}
  color={$buttonState.color}
  loading={$buttonState.loading}
  disabled={$buttonState.disabled}
  on:click={handleClick}>
  Submit
</bit-button>
```

## Common Patterns

### Form Actions

```html
<form id="userForm">
  <input type="text" name="username" required>
  <input type="email" name="email" required>
  
  <div class="form-actions">
    <bit-button type="submit" variant="solid" color="success">
      Save
    </bit-button>
    
    <bit-button type="reset" variant="outline" color="secondary">
      Reset
    </bit-button>
    
    <bit-button type="button" variant="ghost" color="error">
      Delete
    </bit-button>
  </div>
</form>
```

### Confirmation Dialog

```html
<div class="dialog">
  <h2>Confirm Delete</h2>
  <p>Are you sure you want to delete this item?</p>
  
  <div class="dialog-actions">
    <bit-button 
      variant="solid" 
      color="error"
      id="confirmBtn">
      Delete
    </bit-button>
    
    <bit-button 
      variant="ghost" 
      color="secondary"
      id="cancelBtn">
      Cancel
    </bit-button>
  </div>
</div>

<script>
  document.getElementById('confirmBtn').addEventListener('click', async (e) => {
    const button = e.target;
    button.setAttribute('loading', '');
    
    try {
      await deleteItem();
      closeDialog();
    } finally {
      button.removeAttribute('loading');
    }
  });
</script>
```

### Pagination

```html
<div class="pagination">
  <bit-button 
    variant="ghost" 
    size="sm"
    id="prevBtn"
    disabled>
    Previous
  </bit-button>
  
  <bit-button variant="text" size="sm">1</bit-button>
  <bit-button variant="solid" size="sm">2</bit-button>
  <bit-button variant="text" size="sm">3</bit-button>
  
  <bit-button 
    variant="ghost" 
    size="sm"
    id="nextBtn">
    Next
  </bit-button>
</div>
```

### Toolbar

```html
<div class="toolbar">
  <bit-button 
    variant="ghost" 
    size="sm"
    icon-only
    aria-label="Bold">
    <svg>...</svg>
  </bit-button>
  
  <bit-button 
    variant="ghost" 
    size="sm"
    icon-only
    aria-label="Italic">
    <svg>...</svg>
  </bit-button>
  
  <bit-button 
    variant="ghost" 
    size="sm"
    icon-only
    aria-label="Underline">
    <svg>...</svg>
  </bit-button>
  
  <div class="divider"></div>
  
  <bit-button 
    variant="ghost" 
    size="sm"
    icon-only
    aria-label="Link">
    <svg>...</svg>
  </bit-button>
</div>
```

### Loading States

```html
<bit-button id="asyncBtn" variant="solid" color="primary">
  Load Data
</bit-button>

<script>
  const button = document.getElementById('asyncBtn');
  
  button.addEventListener('click', async () => {
    // Show loading
    button.setAttribute('loading', '');
    button.setAttribute('disabled', '');
    button.textContent = 'Loading...';
    
    try {
      const data = await fetchData();
      button.textContent = 'Success!';
      
      // Reset after 2 seconds
      setTimeout(() => {
        button.textContent = 'Load Data';
        button.removeAttribute('loading');
        button.removeAttribute('disabled');
      }, 2000);
    } catch (error) {
      button.textContent = 'Failed';
      button.setAttribute('color', 'error');
      button.removeAttribute('loading');
      button.removeAttribute('disabled');
    }
  });
</script>
```

### Button Group

```html
<div class="button-group">
  <bit-button variant="bordered" size="sm">Day</bit-button>
  <bit-button variant="solid" size="sm">Week</bit-button>
  <bit-button variant="bordered" size="sm">Month</bit-button>
</div>

<style>
  .button-group {
    display: inline-flex;
    gap: 0;
  }
  
  .button-group bit-button {
    border-radius: 0;
  }
  
  .button-group bit-button:first-child {
    border-top-left-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
  }
  
  .button-group bit-button:last-child {
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
  }
</style>
```

## Advanced Examples

### Debounced Button

```typescript
function createDebouncedButton(selector: string, delay = 300) {
  const button = document.querySelector(selector);
  let timeoutId: number;
  
  button?.addEventListener('click', (e) => {
    e.preventDefault();
    
    clearTimeout(timeoutId);
    button.setAttribute('disabled', '');
    
    timeoutId = setTimeout(() => {
      button.removeAttribute('disabled');
      // Perform action
      handleAction();
    }, delay);
  });
}

createDebouncedButton('#submitBtn', 500);
```

### Progress Button

```html
<bit-button id="progressBtn" variant="solid" color="primary">
  Upload File
</bit-button>

<div id="progress" style="display: none;">
  <progress value="0" max="100"></progress>
  <span id="progressText">0%</span>
</div>

<script>
  const button = document.getElementById('progressBtn');
  const progressBar = document.getElementById('progress');
  const progressText = document.getElementById('progressText');
  
  button.addEventListener('click', async () => {
    button.style.display = 'none';
    progressBar.style.display = 'block';
    
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      progressBar.querySelector('progress').value = i;
      progressText.textContent = `${i}%`;
    }
    
    progressBar.style.display = 'none';
    button.style.display = 'inline-flex';
  });
</script>
```

### Animated Button

```html
<bit-button 
  id="animatedBtn"
  style="
    --button-transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  ">
  Hover me
</bit-button>

<script>
  const button = document.getElementById('animatedBtn');
  
  button.addEventListener('mouseenter', () => {
    button.style.setProperty('transform', 'scale(1.1) rotate(2deg)');
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.setProperty('transform', 'scale(1) rotate(0deg)');
  });
</script>
```

### Keyboard Shortcuts

```html
<bit-button id="saveBtn" variant="solid" color="primary">
  Save
  <span slot="suffix" style="opacity: 0.6; font-size: 0.875em;">
    Ctrl+S
  </span>
</bit-button>

<script>
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      document.getElementById('saveBtn').click();
    }
  });
</script>
```

## Theming Examples

### Custom Theme

```css
/* Custom brand theme */
:root {
  --color-primary: #8b5cf6;
  --color-primary-light: #a78bfa;
  --color-primary-dark: #7c3aed;
}

/* Apply to all buttons */
bit-button {
  --button-font-weight: 600;
  --button-radius: 0.5rem;
  --button-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Specific variant customization */
bit-button[variant="solid"] {
  --button-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

bit-button[variant="solid"]:hover {
  --button-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}
```

### Dynamic Theme

```typescript
function applyTheme(themeName: string) {
  const themes = {
    ocean: {
      '--color-primary': '#0ea5e9',
      '--color-success': '#06b6d4',
      '--color-error': '#f43f5e',
    },
    forest: {
      '--color-primary': '#059669',
      '--color-success': '#10b981',
      '--color-error': '#dc2626',
    },
    sunset: {
      '--color-primary': '#f97316',
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

// Switch theme
applyTheme('ocean');
```

## Testing Examples

### Unit Testing

```typescript
import { expect, test } from 'vitest';
import '@vielzeug/buildit/button';

test('button renders correctly', async () => {
  const button = document.createElement('bit-button');
  button.textContent = 'Test Button';
  document.body.appendChild(button);

  await new Promise(resolve => setTimeout(resolve, 0));

  const shadowButton = button.shadowRoot?.querySelector('button');
  expect(shadowButton).toBeTruthy();
  expect(shadowButton?.textContent).toContain('Test Button');

  document.body.removeChild(button);
});

test('button emits click event', async () => {
  const button = document.createElement('bit-button');
  document.body.appendChild(button);

  let clicked = false;
  button.addEventListener('click', () => {
    clicked = true;
  });

  button.shadowRoot?.querySelector('button')?.click();
  expect(clicked).toBe(true);

  document.body.removeChild(button);
});
```

### E2E Testing (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('button interaction', async ({ page }) => {
  await page.goto('/');
  
  const button = page.locator('bit-button');
  
  // Check initial state
  await expect(button).toBeVisible();
  await expect(button).not.toBeDisabled();
  
  // Click button
  await button.click();
  
  // Check loading state
  await expect(button).toHaveAttribute('loading');
  await expect(button).toBeDisabled();
});
```

## Accordion Examples

### FAQ Section

```html
<!DOCTYPE html>
<html>
  <head>
    <title>FAQ - Frequently Asked Questions</title>
    <style>
      .faq-container {
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      
      h1 {
        margin-bottom: 2rem;
        color: #1f2937;
      }
    </style>
  </head>
  <body>
    <div class="faq-container">
      <h1>Frequently Asked Questions</h1>
      
      <bit-accordion>
        <bit-accordion-item expanded>
          <span slot="header">What is Buildit?</span>
          <p>Buildit is a modern, accessible UI component library built with web components. 
          It provides framework-agnostic components that work with React, Vue, Svelte, or vanilla JavaScript.</p>
        </bit-accordion-item>
        
        <bit-accordion-item>
          <span slot="header">How do I install Buildit?</span>
          <div>
            <p>Install Buildit using your preferred package manager:</p>
            <pre><code>npm install @vielzeug/buildit
# or
pnpm add @vielzeug/buildit
# or
yarn add @vielzeug/buildit</code></pre>
          </div>
        </bit-accordion-item>
        
        <bit-accordion-item>
          <span slot="header">Is it accessible?</span>
          <p>Yes! All Buildit components follow WCAG 2.1 Level AA guidelines. They include:</p>
          <ul>
            <li>Full keyboard navigation support</li>
            <li>Screen reader compatibility</li>
            <li>Proper ARIA attributes</li>
            <li>Focus management</li>
          </ul>
        </bit-accordion-item>
        
        <bit-accordion-item>
          <span slot="header">Can I customize the styling?</span>
          <p>Absolutely! All components expose CSS custom properties for deep customization. 
          You can also use standard CSS to style the components while maintaining their functionality.</p>
        </bit-accordion-item>
      </bit-accordion>
    </div>

    <script type="module">
      import '@vielzeug/buildit/accordion';
      import '@vielzeug/buildit/accordion-item';
    </script>
  </body>
</html>
```

### Settings Panel with React

```tsx
import '@vielzeug/buildit/accordion';
import '@vielzeug/buildit/accordion-item';
import { useState } from 'react';

interface Settings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsAlerts: boolean;
  profileVisibility: boolean;
  showOnlineStatus: boolean;
  theme: 'light' | 'dark' | 'auto';
}

function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>({
    emailNotifications: true,
    pushNotifications: false,
    smsAlerts: true,
    profileVisibility: true,
    showOnlineStatus: false,
    theme: 'auto'
  });

  const handleToggle = (key: keyof Settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  const handleThemeChange = (theme: Settings['theme']) => {
    setSettings(prev => ({ ...prev, theme }));
  };

  return (
    <div className="settings-panel">
      <h2>Settings</h2>
      
      <bit-accordion allow-multiple variant="bordered">
        <bit-accordion-item expanded>
          <span slot="header">🔔 Notifications</span>
          <div className="settings-group">
            <label>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
              />
              Email notifications
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.pushNotifications}
                onChange={() => handleToggle('pushNotifications')}
              />
              Push notifications
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.smsAlerts}
                onChange={() => handleToggle('smsAlerts')}
              />
              SMS alerts
            </label>
          </div>
        </bit-accordion-item>
        
        <bit-accordion-item>
          <span slot="header">🔒 Privacy</span>
          <div className="settings-group">
            <label>
              <input
                type="checkbox"
                checked={settings.profileVisibility}
                onChange={() => handleToggle('profileVisibility')}
              />
              Profile visibility
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.showOnlineStatus}
                onChange={() => handleToggle('showOnlineStatus')}
              />
              Show online status
            </label>
          </div>
        </bit-accordion-item>
        
        <bit-accordion-item>
          <span slot="header">🎨 Appearance</span>
          <div className="settings-group">
            <label>Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => handleThemeChange(e.target.value as Settings['theme'])}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </bit-accordion-item>
      </bit-accordion>
    </div>
  );
}
```

### Product Features with Vue

```vue
<template>
  <div class="product-features">
    <h2>Features</h2>
    
    <bit-accordion variant="ghost" @change="handleChange">
      <bit-accordion-item
        v-for="feature in features"
        :key="feature.id"
        :expanded="expandedFeatures.includes(feature.id)">
        <span slot="header">
          <span class="feature-icon">{{ feature.icon }}</span>
          {{ feature.title }}
        </span>
        
        <div class="feature-content">
          <p>{{ feature.description }}</p>
          <ul>
            <li v-for="benefit in feature.benefits" :key="benefit">
              {{ benefit }}
            </li>
          </ul>
          <bit-button
            variant="outline"
            size="sm"
            @click="learnMore(feature.id)">
            Learn More
          </bit-button>
        </div>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</template>

<script setup lang="ts">
import '@vielzeug/buildit/accordion';
import '@vielzeug/buildit/accordion-item';
import '@vielzeug/buildit/button';
import { ref } from 'vue';

interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  benefits: string[];
}

const features = ref<Feature[]>([
  {
    id: 'performance',
    icon: '⚡',
    title: 'Lightning Fast',
    description: 'Built with performance in mind, our components are optimized for speed.',
    benefits: [
      'Minimal bundle size',
      'Tree-shakeable imports',
      'Zero runtime dependencies',
      'Lazy loading support'
    ]
  },
  {
    id: 'accessible',
    icon: '♿',
    title: 'Fully Accessible',
    description: 'WCAG 2.1 Level AA compliant components for everyone.',
    benefits: [
      'Keyboard navigation',
      'Screen reader support',
      'ARIA attributes',
      'Focus management'
    ]
  },
  {
    id: 'customizable',
    icon: '🎨',
    title: 'Highly Customizable',
    description: 'Customize every aspect with CSS custom properties.',
    benefits: [
      'CSS variables',
      'Theme support',
      'Dark mode ready',
      'No styling conflicts'
    ]
  }
]);

const expandedFeatures = ref<string[]>(['performance']);

const handleChange = (e: CustomEvent) => {
  const items = e.detail.expandedItems as HTMLElement[];
  expandedFeatures.value = items.map(item => 
    item.querySelector('[slot="header"]')?.textContent?.trim() || ''
  );
};

const learnMore = (featureId: string) => {
  console.log('Learn more about:', featureId);
};
</script>

<style scoped>
.product-features {
  max-width: 900px;
  margin: 0 auto;
}

.feature-icon {
  font-size: 1.5em;
  margin-right: 0.5rem;
}

.feature-content {
  padding: 1rem 0;
}

.feature-content ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.feature-content li {
  margin: 0.5rem 0;
}
</style>
```

### Documentation Navigation with Svelte

```svelte
<script lang="ts">
  import '@vielzeug/buildit/accordion';
  import '@vielzeug/buildit/accordion-item';
  
  interface DocSection {
    title: string;
    items: { title: string; href: string }[];
  }
  
  const sections: DocSection[] = [
    {
      title: 'Getting Started',
      items: [
        { title: 'Installation', href: '#install' },
        { title: 'Quick Start', href: '#quickstart' },
        { title: 'Configuration', href: '#config' }
      ]
    },
    {
      title: 'Components',
      items: [
        { title: 'Button', href: '#button' },
        { title: 'Accordion', href: '#accordion' },
        { title: 'Input', href: '#input' }
      ]
    },
    {
      title: 'API Reference',
      items: [
        { title: 'Props', href: '#props' },
        { title: 'Events', href: '#events' },
        { title: 'Slots', href: '#slots' }
      ]
    }
  ];
  
  let currentSection = 'Getting Started';
  
  function navigateTo(href: string) {
    window.location.hash = href;
  }
</script>

<nav class="doc-nav">
  <bit-accordion allow-multiple size="sm">
    {#each sections as section}
      <bit-accordion-item expanded={section.title === currentSection}>
        <span slot="header">{section.title}</span>
        
        <ul class="nav-links">
          {#each section.items as item}
            <li>
              <a href={item.href} on:click={() => navigateTo(item.href)}>
                {item.title}
              </a>
            </li>
          {/each}
        </ul>
      </bit-accordion-item>
    {/each}
  </bit-accordion>
</nav>

<style>
  .doc-nav {
    width: 250px;
    position: sticky;
    top: 2rem;
  }
  
  .nav-links {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .nav-links li {
    margin: 0.25rem 0;
  }
  
  .nav-links a {
    display: block;
    padding: 0.5rem;
    color: inherit;
    text-decoration: none;
    border-radius: 0.25rem;
    transition: background-color 0.2s;
  }
  
  .nav-links a:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
</style>
```

## Next Steps

- **[API Reference](./api.md)** – Complete API documentation
- **[Usage Guide](./usage.md)** – Installation and usage
- **[Button Component](components/button.md)** – Detailed button documentation
- **[Accordion Component](components/accordion.md)** – Detailed accordion documentation

