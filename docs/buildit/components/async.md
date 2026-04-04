---
title: Async — Buildit
description: Composable async data state wrapper for loading, empty, error, and success UI.
---

# Async

A zero-boilerplate wrapper that drives the right UI for every stage of an async data fetch. It manages `aria-busy`, `aria-live`, and `role` automatically so screen readers always stay informed.

`status` defaults to `success`, so default slotted content is visible unless you explicitly set another state.

## Features

- 🔄 **5 statuses**: `idle`, `loading`, `empty`, `error`, `success`
- 💀 **Default skeleton** loading state — no setup needed
- 📭 **Built-in empty state** with configurable label and description
- ⚠️ **Built-in error state** with optional retry button
- 🎰 **Fully slottable** — replace any built-in view with your own content
- ♿ **Automatic ARIA** — `aria-busy`, `aria-live`, `role="alert"` managed for you

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/feedback/async/async.ts
:::

## Basic Usage

```html
<bit-async status="loading"></bit-async>

<script type="module">
  import '@vielzeug/buildit/async';
  import '@vielzeug/buildit/skeleton';
</script>
```

Switch `status` from your data layer:

```js
const el = document.querySelector('bit-async');

async function loadData() {
  el.status = 'loading';
  try {
    const data = await fetch('/api/items').then((r) => r.json());
    el.status = data.length ? 'success' : 'empty';
  } catch {
    el.status = 'error';
  }
}
```

## Status: Loading

The default loading view renders a skeleton stack automatically. No slot required.

<ComponentPreview center>

```html
<bit-async status="loading" style="width: 100%; max-width: 24rem;"></bit-async>

<script type="module">
  import '@vielzeug/buildit/async';
  import '@vielzeug/buildit/skeleton';
</script>
```

</ComponentPreview>

### Custom Loading Slot

<ComponentPreview center>

```html
<bit-async status="loading" style="width: 100%; max-width: 24rem;">
  <div slot="loading" style="display: flex; gap: var(--size-3); align-items: center; padding: var(--size-4);">
    <bit-skeleton variant="circle" size="md"></bit-skeleton>
    <div style="flex: 1; display: flex; flex-direction: column; gap: var(--size-2);">
      <bit-skeleton variant="text" lines="1" width="60%"></bit-skeleton>
      <bit-skeleton variant="text" lines="1" width="40%"></bit-skeleton>
    </div>
  </div>
</bit-async>

<script type="module">
  import '@vielzeug/buildit/async';
  import '@vielzeug/buildit/skeleton';
</script>
```

</ComponentPreview>

## Status: Empty

<ComponentPreview center>

```html
<bit-async
  status="empty"
  empty-label="No results found"
  empty-description="Try adjusting your search or filters."
  style="width: 100%; max-width: 24rem;"
></bit-async>

<script type="module">
  import '@vielzeug/buildit/async';
</script>
```

</ComponentPreview>

### Custom Empty Slot

<ComponentPreview center>

```html
<bit-async status="empty" style="width: 100%; max-width: 24rem;">
  <div slot="empty" style="display: flex; flex-direction: column; align-items: center; gap: var(--size-3); padding: var(--size-10) var(--size-6); text-align: center;">
    <bit-avatar size="xl" label="📭"></bit-avatar>
    <p style="font-size: var(--text-sm); color: var(--color-contrast-500);">Your inbox is empty</p>
    <bit-button variant="outline" size="sm">Compose message</bit-button>
  </div>
</bit-async>

<script type="module">
  import '@vielzeug/buildit/async';
  import '@vielzeug/buildit/avatar';
  import '@vielzeug/buildit/button';
</script>
```

</ComponentPreview>

## Status: Error

<ComponentPreview center>

```html
<bit-async
  status="error"
  error-label="Failed to load data"
  error-description="Check your connection and try again."
  retryable
  style="width: 100%; max-width: 24rem;"
></bit-async>

<script type="module">
  import '@vielzeug/buildit/async';
</script>
```

</ComponentPreview>

### Custom Error Slot

<ComponentPreview center>

```html
<bit-async status="error" style="width: 100%; max-width: 24rem;">
  <div slot="error">
    <bit-alert color="error" variant="bordered" heading="Request failed">
      The server returned an error. Please try again later.
      <div slot="actions">
        <bit-button color="error" variant="outline" size="sm">Retry</bit-button>
      </div>
    </bit-alert>
  </div>
</bit-async>

<script type="module">
  import '@vielzeug/buildit/async';
  import '@vielzeug/buildit/alert';
  import '@vielzeug/buildit/button';
</script>
```

</ComponentPreview>

## Status: Success

<ComponentPreview center>

```html
<bit-async status="success" style="width: 100%; max-width: 24rem;">
  <bit-card elevation="1" padding="md">
    <span slot="header">Latest activity</span>
    <p>Everything loaded successfully.</p>
  </bit-card>
</bit-async>

<script type="module">
  import '@vielzeug/buildit/async';
  import '@vielzeug/buildit/card';
</script>
```

</ComponentPreview>

## Retry

Add `retryable` to show a built-in retry button in the error state. Listen for the `retry` event to re-trigger your fetch.

<ComponentPreview center>

```html
<bit-async
  id="data-region"
  status="error"
  error-label="Could not load items"
  retryable
  style="width: 100%; max-width: 24rem;"
></bit-async>

<script type="module">
  import '@vielzeug/buildit/async';

  document.getElementById('data-region').addEventListener('retry', () => {
    console.log('Retry triggered');
  });
</script>
```

</ComponentPreview>

## Composing with bit-card

<ComponentPreview center>

```html
<bit-card elevation="1" style="width: 100%; max-width: 24rem;">
  <span slot="header">Latest orders</span>
  <bit-async
    status="empty"
    empty-label="No orders yet"
    empty-description="Orders will appear here once placed."
  ></bit-async>
</bit-card>

<script type="module">
  import '@vielzeug/buildit/async';
  import '@vielzeug/buildit/card';
</script>
```

</ComponentPreview>

## Composing with bit-table

<ComponentPreview center>

```html
<bit-async status="loading" style="width: 100%;">
  <bit-table striped bordered caption="Members">
    <bit-tr head>
      <bit-th scope="col">Name</bit-th>
      <bit-th scope="col">Role</bit-th>
    </bit-tr>
    <bit-tr><bit-td>Alice</bit-td><bit-td>Admin</bit-td></bit-tr>
    <bit-tr><bit-td>Bob</bit-td><bit-td>Editor</bit-td></bit-tr>
  </bit-table>
</bit-async>

<script type="module">
  import '@vielzeug/buildit/async';
  import '@vielzeug/buildit/table';
</script>
```

</ComponentPreview>

## Status values

| `status`  | What renders                         | `aria-busy` | `aria-live` |
| --------- | ------------------------------------ | ----------- | ----------- |
| `idle`    | nothing (empty region)               | `false`     | `polite`    |
| `loading` | `loading` slot or skeleton stack     | `true`      | `polite`    |
| `empty`   | `empty` slot or built-in empty state | `false`     | `polite`    |
| `error`   | `error` slot or built-in error state | `false`     | `assertive` |
| `success` | default slot (your content)          | `false`     | `polite`    |

## Props

| Attribute           | Type          | Default                  | Description                                         |
| ------------------- | ------------- | ------------------------ | --------------------------------------------------- |
| `status`            | `AsyncStatus` | `'success'`              | Current data-fetch status                           |
| `empty-label`       | `string`      | `'No content yet'`       | Heading for the built-in empty state                |
| `empty-description` | `string`      | —                        | Description below the empty-state heading           |
| `error-label`       | `string`      | `'Something went wrong'` | Heading for the built-in error state                |
| `error-description` | `string`      | —                        | Description below the error-state heading           |
| `retryable`         | `boolean`     | `false`                  | Show retry button in the built-in error state       |

## Events

| Event   | Detail | Description                                     |
| ------- | ------ | ----------------------------------------------- |
| `retry` | —      | Fired when the built-in retry button is clicked |

## Slots

| Slot        | Description                                          |
| ----------- | ---------------------------------------------------- |
| *(default)* | Rendered when `status="success"`                     |
| `loading`   | Replaces the built-in skeleton stack during loading  |
| `empty`     | Replaces the built-in empty state illustration       |
| `error`     | Replaces the built-in error view                     |

## CSS Custom Properties

| Property            | Default                | Description                                 |
| ------------------- | ---------------------- | ------------------------------------------- |
| `--async-color`     | `--color-contrast-500` | Icon/text color for built-in states         |
| `--async-icon-size` | `var(--size-12)`       | Icon size in built-in empty/error views     |
| `--async-gap`       | `var(--size-3)`        | Gap between elements in built-in views      |

## Accessibility

`bit-async` manages ARIA on the host element automatically:

- **`aria-busy="true"`** while status is `loading` — screen readers announce the busy region.
- **`aria-live="assertive"`** in the `error` state — error messages interrupt immediately.
- **`aria-live="polite"`** in all other states — updates are announced after the current action.
- The built-in error region uses `role="alert"` for immediate screen reader pickup.
- The built-in loading and empty regions use `role="status"` for polite announcements.
- The retry button is typed `type="button"` to prevent accidental form submission.
