---
title: Async — Refine
description: Composable async data state wrapper for loading, empty, error, and success UI.
---

# Async

A zero-boilerplate wrapper that drives the right UI for every stage of an async data fetch. It manages `aria-busy`, `aria-live`, and `role` automatically so screen readers always stay informed.

`status` defaults to `success`, so default slotted content is visible unless you explicitly set another state.

## Status: Loading

The default loading view renders a skeleton stack automatically. No slot required.

<ComponentPreview center>

```html
<ore-async status="loading" style="width: 100%; max-width: 24rem;"></ore-async>
```

</ComponentPreview>

### Custom Loading Slot

<ComponentPreview center>

```html
<ore-async status="loading" style="width: 100%; max-width: 24rem;">
  <div slot="loading" style="display: flex; gap: var(--size-3); align-items: center; padding: var(--size-4);">
    <ore-skeleton variant="circle" size="md"></ore-skeleton>
    <div style="flex: 1; display: flex; flex-direction: column; gap: var(--size-2);">
      <ore-skeleton variant="text" lines="1" width="60%"></ore-skeleton>
      <ore-skeleton variant="text" lines="1" width="40%"></ore-skeleton>
    </div>
  </div>
</ore-async>
```

</ComponentPreview>

## Status: Empty

<ComponentPreview center>

```html
<ore-async
  status="empty"
  empty-label="No results found"
  empty-description="Try adjusting your search or filters."
  style="width: 100%; max-width: 24rem;"></ore-async>
```

</ComponentPreview>

### Custom Empty Slot

<ComponentPreview center>

```html
<ore-async status="empty" style="width: 100%; max-width: 24rem;">
  <div
    slot="empty"
    style="display: flex; flex-direction: column; align-items: center; gap: var(--size-3); padding: var(--size-10) var(--size-6); text-align: center;">
    <ore-avatar size="xl" label="<ore-icon name="mail-open" size="16"></ore-icon>"></ore-avatar>
    <p style="font-size: var(--text-sm); color: var(--color-contrast-500);">Your inbox is empty</p>
    <ore-button variant="outline" size="sm">Compose message</ore-button>
  </div>
</ore-async>
```

</ComponentPreview>

## Status: Error

<ComponentPreview center>

```html
<ore-async
  status="error"
  error-label="Failed to load data"
  error-description="Check your connection and try again."
  retryable
  style="width: 100%; max-width: 24rem;"></ore-async>
```

</ComponentPreview>

### Custom Error Slot

<ComponentPreview center>

```html
<ore-async status="error" style="width: 100%; max-width: 24rem;">
  <div slot="error">
    <ore-alert color="error" variant="bordered" heading="Request failed">
      The server returned an error. Please try again later.
      <div slot="actions">
        <ore-button color="error" variant="outline" size="sm">Retry</ore-button>
      </div>
    </ore-alert>
  </div>
</ore-async>
```

</ComponentPreview>

## Status: Success

<ComponentPreview center>

```html
<ore-async status="success" style="width: 100%; max-width: 24rem;">
  <ore-card elevation="1" padding="md">
    <span slot="header">Latest activity</span>
    <p>Everything loaded successfully.</p>
  </ore-card>
</ore-async>
```

</ComponentPreview>

## Retry

Add `retryable` to show a built-in retry button in the error state. Listen for the `retry` event to re-trigger your fetch.

<ComponentPreview center>

```html
<ore-async
  id="data-region"
  status="error"
  error-label="Could not load items"
  retryable
  style="width: 100%; max-width: 24rem;"></ore-async>

<script type="module">
  import '@vielzeug/refine/async';

  document.getElementById('data-region').addEventListener('retry', () => {
    console.log('Retry triggered');
  });
</script>
```

</ComponentPreview>

## Composing with ore-card

<ComponentPreview center>

```html
<ore-card elevation="1" style="width: 100%; max-width: 24rem;">
  <span slot="header">Latest orders</span>
  <ore-async
    status="empty"
    empty-label="No orders yet"
    empty-description="Orders will appear here once placed."></ore-async>
</ore-card>
```

</ComponentPreview>

## Composing with ore-table

Use the `loading` slot to render a table-shaped skeleton that matches the real table layout. When data arrives, switch `status` to `success` and the real table appears.

<ComponentPreview center>

```html
<div style="display: flex; flex-direction: column; gap: var(--size-3); width: 100%;">
  <div style="display: flex; gap: var(--size-2);">
    <ore-button id="btn-load" size="sm" variant="outline">Simulate loading</ore-button>
    <ore-button id="btn-done" size="sm" variant="outline">Simulate success</ore-button>
  </div>

  <ore-async id="members-async" status="loading" style="width: 100%;">
    <!-- Loading slot: ore-table in loading state with ore-skeleton cells.
         ore-td element children are deep-cloned into the native shadow <td>,
         so ore-skeleton renders correctly inside the table structure. -->
    <ore-table slot="loading" striped bordered caption="Members" loading>
      <ore-tr head>
        <ore-th>Name</ore-th>
        <ore-th>Role</ore-th>
        <ore-th>Status</ore-th>
      </ore-tr>
      <ore-tr>
        <ore-td><ore-skeleton variant="text" lines="1" width="70%"></ore-skeleton></ore-td>
        <ore-td><ore-skeleton variant="text" lines="1" width="50%"></ore-skeleton></ore-td>
        <ore-td><ore-skeleton variant="text" lines="1" width="60%"></ore-skeleton></ore-td>
      </ore-tr>
      <ore-tr>
        <ore-td><ore-skeleton variant="text" lines="1" width="80%"></ore-skeleton></ore-td>
        <ore-td><ore-skeleton variant="text" lines="1" width="60%"></ore-skeleton></ore-td>
        <ore-td><ore-skeleton variant="text" lines="1" width="45%"></ore-skeleton></ore-td>
      </ore-tr>
      <ore-tr>
        <ore-td><ore-skeleton variant="text" lines="1" width="90%"></ore-skeleton></ore-td>
        <ore-td><ore-skeleton variant="text" lines="1" width="55%"></ore-skeleton></ore-td>
        <ore-td><ore-skeleton variant="text" lines="1" width="65%"></ore-skeleton></ore-td>
      </ore-tr>
    </ore-table>

    <!-- Default slot: real table shown on success -->
    <ore-table striped bordered caption="Members">
      <ore-tr head>
        <ore-th>Name</ore-th>
        <ore-th>Role</ore-th>
        <ore-th>Status</ore-th>
      </ore-tr>
      <ore-tr><ore-td>Alice</ore-td><ore-td>Admin</ore-td><ore-td>Active</ore-td></ore-tr>
      <ore-tr><ore-td>Bob</ore-td><ore-td>Editor</ore-td><ore-td>Active</ore-td></ore-tr>
      <ore-tr><ore-td>Carol</ore-td><ore-td>Viewer</ore-td><ore-td>Inactive</ore-td></ore-tr>
    </ore-table>
  </ore-async>
</div>

<script type="module">
  import '@vielzeug/refine/async';
  import '@vielzeug/refine/skeleton';
  import '@vielzeug/refine/table';
  import '@vielzeug/refine/button';

  const el = document.getElementById('members-async');
  document.getElementById('btn-load').addEventListener('click', () => {
    el.status = 'loading';
  });
  document.getElementById('btn-done').addEventListener('click', () => {
    el.status = 'success';
  });
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

| Attribute           | Type          | Default                  | Description                                   |
| ------------------- | ------------- | ------------------------ | --------------------------------------------- |
| `status`            | `AsyncStatus` | `'success'`              | Current data-fetch status                     |
| `empty-label`       | `string`      | `'No content yet'`       | Heading for the built-in empty state          |
| `empty-description` | `string`      | —                        | Description below the empty-state heading     |
| `error-label`       | `string`      | `'Something went wrong'` | Heading for the built-in error state          |
| `error-description` | `string`      | —                        | Description below the error-state heading     |
| `retryable`         | `boolean`     | `false`                  | Show retry button in the built-in error state |

## Events

| Event   | Detail | Description                                     |
| ------- | ------ | ----------------------------------------------- |
| `retry` | —      | Fired when the built-in retry button is clicked |

## Slots

| Slot        | Description                                         |
| ----------- | --------------------------------------------------- |
| _(default)_ | Rendered when `status="success"`                    |
| `loading`   | Replaces the built-in skeleton stack during loading |
| `empty`     | Replaces the built-in empty state illustration      |
| `error`     | Replaces the built-in error view                    |

## CSS Custom Properties

| Property            | Default                | Description                             |
| ------------------- | ---------------------- | --------------------------------------- |
| `--async-color`     | `--color-contrast-500` | Icon/text color for built-in states     |
| `--async-icon-size` | `var(--size-12)`       | Icon size in built-in empty/error views |
| `--async-gap`       | `var(--size-3)`        | Gap between elements in built-in views  |

## Accessibility

`ore-async` manages ARIA on the host element automatically. While `status` is `loading`, `aria-busy="true"` is set so screen readers announce the busy region. In the `error` state, `aria-live="assertive"` ensures error messages interrupt the user immediately. All other states use `aria-live="polite"` so updates are announced after the current action completes.

The built-in error region uses `role="alert"` for immediate screen reader pickup, while the built-in loading and empty regions use `role="status"` for polite announcements. The retry button is typed `type="button"` to prevent accidental form submission.
