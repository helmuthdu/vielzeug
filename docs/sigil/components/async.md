---
title: Async — Sigil
description: Composable async data state wrapper for loading, empty, error, and success UI.
---

# Async

A zero-boilerplate wrapper that drives the right UI for every stage of an async data fetch. It manages `aria-busy`, `aria-live`, and `role` automatically so screen readers always stay informed.

`status` defaults to `success`, so default slotted content is visible unless you explicitly set another state.

## Status: Loading

The default loading view renders a skeleton stack automatically. No slot required.

<ComponentPreview center>

```html
<sg-async status="loading" style="width: 100%; max-width: 24rem;"></sg-async>
```

</ComponentPreview>

### Custom Loading Slot

<ComponentPreview center>

```html
<sg-async status="loading" style="width: 100%; max-width: 24rem;">
  <div slot="loading" style="display: flex; gap: var(--size-3); align-items: center; padding: var(--size-4);">
    <sg-skeleton variant="circle" size="md"></sg-skeleton>
    <div style="flex: 1; display: flex; flex-direction: column; gap: var(--size-2);">
      <sg-skeleton variant="text" lines="1" width="60%"></sg-skeleton>
      <sg-skeleton variant="text" lines="1" width="40%"></sg-skeleton>
    </div>
  </div>
</sg-async>
```

</ComponentPreview>

## Status: Empty

<ComponentPreview center>

```html
<sg-async
  status="empty"
  empty-label="No results found"
  empty-description="Try adjusting your search or filters."
  style="width: 100%; max-width: 24rem;"></sg-async>
```

</ComponentPreview>

### Custom Empty Slot

<ComponentPreview center>

```html
<sg-async status="empty" style="width: 100%; max-width: 24rem;">
  <div
    slot="empty"
    style="display: flex; flex-direction: column; align-items: center; gap: var(--size-3); padding: var(--size-10) var(--size-6); text-align: center;">
    <sg-avatar size="xl" label="<sg-icon name="mail-open" size="16"></sg-icon>"></sg-avatar>
    <p style="font-size: var(--text-sm); color: var(--color-contrast-500);">Your inbox is empty</p>
    <sg-button variant="outline" size="sm">Compose message</sg-button>
  </div>
</sg-async>
```

</ComponentPreview>

## Status: Error

<ComponentPreview center>

```html
<sg-async
  status="error"
  error-label="Failed to load data"
  error-description="Check your connection and try again."
  retryable
  style="width: 100%; max-width: 24rem;"></sg-async>
```

</ComponentPreview>

### Custom Error Slot

<ComponentPreview center>

```html
<sg-async status="error" style="width: 100%; max-width: 24rem;">
  <div slot="error">
    <sg-alert color="error" variant="bordered" heading="Request failed">
      The server returned an error. Please try again later.
      <div slot="actions">
        <sg-button color="error" variant="outline" size="sm">Retry</sg-button>
      </div>
    </sg-alert>
  </div>
</sg-async>
```

</ComponentPreview>

## Status: Success

<ComponentPreview center>

```html
<sg-async status="success" style="width: 100%; max-width: 24rem;">
  <sg-card elevation="1" padding="md">
    <span slot="header">Latest activity</span>
    <p>Everything loaded successfully.</p>
  </sg-card>
</sg-async>
```

</ComponentPreview>

## Retry

Add `retryable` to show a built-in retry button in the error state. Listen for the `retry` event to re-trigger your fetch.

<ComponentPreview center>

```html
<sg-async
  id="data-region"
  status="error"
  error-label="Could not load items"
  retryable
  style="width: 100%; max-width: 24rem;"></sg-async>

<script type="module">
  import '@vielzeug/sigil/async';

  document.getElementById('data-region').addEventListener('retry', () => {
    console.log('Retry triggered');
  });
</script>
```

</ComponentPreview>

## Composing with sg-card

<ComponentPreview center>

```html
<sg-card elevation="1" style="width: 100%; max-width: 24rem;">
  <span slot="header">Latest orders</span>
  <sg-async
    status="empty"
    empty-label="No orders yet"
    empty-description="Orders will appear here once placed."></sg-async>
</sg-card>
```

</ComponentPreview>

## Composing with sg-table

Use the `loading` slot to render a table-shaped skeleton that matches the real table layout. When data arrives, switch `status` to `success` and the real table appears.

<ComponentPreview center>

```html
<div style="display: flex; flex-direction: column; gap: var(--size-3); width: 100%;">
  <div style="display: flex; gap: var(--size-2);">
    <sg-button id="btn-load" size="sm" variant="outline">Simulate loading</sg-button>
    <sg-button id="btn-done" size="sm" variant="outline">Simulate success</sg-button>
  </div>

  <sg-async id="members-async" status="loading" style="width: 100%;">
    <!-- Loading slot: sg-table in loading state with sg-skeleton cells.
         sg-td element children are deep-cloned into the native shadow <td>,
         so sg-skeleton renders correctly inside the table structure. -->
    <sg-table slot="loading" striped bordered caption="Members" loading>
      <sg-tr head>
        <sg-th>Name</sg-th>
        <sg-th>Role</sg-th>
        <sg-th>Status</sg-th>
      </sg-tr>
      <sg-tr>
        <sg-td><sg-skeleton variant="text" lines="1" width="70%"></sg-skeleton></sg-td>
        <sg-td><sg-skeleton variant="text" lines="1" width="50%"></sg-skeleton></sg-td>
        <sg-td><sg-skeleton variant="text" lines="1" width="60%"></sg-skeleton></sg-td>
      </sg-tr>
      <sg-tr>
        <sg-td><sg-skeleton variant="text" lines="1" width="80%"></sg-skeleton></sg-td>
        <sg-td><sg-skeleton variant="text" lines="1" width="60%"></sg-skeleton></sg-td>
        <sg-td><sg-skeleton variant="text" lines="1" width="45%"></sg-skeleton></sg-td>
      </sg-tr>
      <sg-tr>
        <sg-td><sg-skeleton variant="text" lines="1" width="90%"></sg-skeleton></sg-td>
        <sg-td><sg-skeleton variant="text" lines="1" width="55%"></sg-skeleton></sg-td>
        <sg-td><sg-skeleton variant="text" lines="1" width="65%"></sg-skeleton></sg-td>
      </sg-tr>
    </sg-table>

    <!-- Default slot: real table shown on success -->
    <sg-table striped bordered caption="Members">
      <sg-tr head>
        <sg-th>Name</sg-th>
        <sg-th>Role</sg-th>
        <sg-th>Status</sg-th>
      </sg-tr>
      <sg-tr><sg-td>Alice</sg-td><sg-td>Admin</sg-td><sg-td>Active</sg-td></sg-tr>
      <sg-tr><sg-td>Bob</sg-td><sg-td>Editor</sg-td><sg-td>Active</sg-td></sg-tr>
      <sg-tr><sg-td>Carol</sg-td><sg-td>Viewer</sg-td><sg-td>Inactive</sg-td></sg-tr>
    </sg-table>
  </sg-async>
</div>

<script type="module">
  import '@vielzeug/sigil/async';
  import '@vielzeug/sigil/skeleton';
  import '@vielzeug/sigil/table';
  import '@vielzeug/sigil/button';

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

`sg-async` manages ARIA on the host element automatically. While `status` is `loading`, `aria-busy="true"` is set so screen readers announce the busy region. In the `error` state, `aria-live="assertive"` ensures error messages interrupt the user immediately. All other states use `aria-live="polite"` so updates are announced after the current action completes.

The built-in error region uses `role="alert"` for immediate screen reader pickup, while the built-in loading and empty regions use `role="status"` for polite announcements. The retry button is typed `type="button"` to prevent accidental form submission.
