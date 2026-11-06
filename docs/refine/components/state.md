---
title: 'State: Refine'
description: 'One element for every stage of async content: loading, empty, error, and success.'
---

# State

A state container for asynchronous content. One element covers the whole lifecycle — idle, loading, empty, error, success — so a data view never hand-rolls four separate fallbacks. The default slot shows on `success`; every other state has a built-in visual that a named slot can replace.

`status` defaults to `success`, so default slotted content is visible unless you explicitly set another state. State changes fade the incoming region in, and the fade honors Motion Mode.

## Status: Loading

The default loading view renders a skeleton stack automatically. No slot required.

<ComponentPreview center>

```html
<ore-state status="loading" style="width: 100%; max-width: 24rem;"></ore-state>
```

</ComponentPreview>

### Custom Loading Slot

<ComponentPreview center>

```html
<ore-state status="loading" style="width: 100%; max-width: 24rem;">
  <div slot="loading" style="display: flex; gap: var(--size-3); align-items: center; padding: var(--size-4);">
    <ore-skeleton variant="circle" size="md"></ore-skeleton>
    <div style="flex: 1; display: flex; flex-direction: column; gap: var(--size-2);">
      <ore-skeleton variant="text" lines="1" width="60%"></ore-skeleton>
      <ore-skeleton variant="text" lines="1" width="40%"></ore-skeleton>
    </div>
  </div>
</ore-state>
```

</ComponentPreview>

## Status: Empty

Empty renders as a full placeholder: an illustration, a title, a description, and an action row. Set the copy with `empty-label` and `empty-description`.

<ComponentPreview center>

```html
<ore-state
  status="empty"
  empty-label="No results found"
  empty-description="Try adjusting your search or filters."
  style="width: 100%; max-width: 24rem;"></ore-state>
```

</ComponentPreview>

### Customizing the Placeholder

Swap the artwork with the `illustration` slot and supply recovery controls with the `actions` slot. Both customize the built-in placeholder without replacing it whole.

<ComponentPreview center>

```html
<ore-state
  status="empty"
  empty-label="Your inbox is empty"
  empty-description="New messages will appear here."
  style="width: 100%; max-width: 24rem;">
  <ore-icon slot="illustration" name="mail-open" size="48" aria-hidden="true"></ore-icon>
  <ore-button slot="actions" variant="outline" size="sm">Compose message</ore-button>
</ore-state>
```

</ComponentPreview>

### Full Replacement Slot

To replace the entire placeholder, slot content into `empty`.

<ComponentPreview center>

```html
<ore-state status="empty" style="width: 100%; max-width: 24rem;">
  <div
    slot="empty"
    style="display: flex; flex-direction: column; align-items: center; gap: var(--size-3); padding: var(--size-10) var(--size-6); text-align: center;">
    <ore-avatar size="xl" label="Inbox"></ore-avatar>
    <p style="font-size: var(--text-sm); color: var(--color-contrast-500);">Your inbox is empty</p>
    <ore-button variant="outline" size="sm">Compose message</ore-button>
  </div>
</ore-state>
```

</ComponentPreview>

## Status: Error

Error reuses the same placeholder with different artwork, copy, and role. Set the copy with `error-label` and `error-description`.

<ComponentPreview center>

```html
<ore-state
  status="error"
  error-label="Failed to load data"
  error-description="Check your connection and try again."
  retryable
  style="width: 100%; max-width: 24rem;"></ore-state>
```

</ComponentPreview>

### Custom Error Slot

<ComponentPreview center>

```html
<ore-state status="error" style="width: 100%; max-width: 24rem;">
  <div slot="error">
    <ore-alert color="error" variant="bordered" heading="Request failed">
      The server returned an error. Please try again later.
      <div slot="actions">
        <ore-button color="error" variant="outline" size="sm">Retry</ore-button>
      </div>
    </ore-alert>
  </div>
</ore-state>
```

</ComponentPreview>

## Status: Success

<ComponentPreview center>

```html
<ore-state status="success" style="width: 100%; max-width: 24rem;">
  <ore-card elevation="1" padding="md">
    <span slot="header">Latest activity</span>
    <p>Everything loaded successfully.</p>
  </ore-card>
</ore-state>
```

</ComponentPreview>

## Retry

Add `retryable` to fill the error placeholder's action row with a built-in retry button, shown only when no `actions` are slotted. Listen for the `retry` event to re-trigger your fetch.

<ComponentPreview center>

```html
<ore-state
  id="data-region"
  status="error"
  error-label="Could not load items"
  retryable
  style="width: 100%; max-width: 24rem;"></ore-state>

<script type="module">
  import '@vielzeug/refine/state';

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
  <ore-state
    status="empty"
    empty-label="No orders yet"
    empty-description="Orders will appear here once placed."></ore-state>
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

  <ore-state id="members-state" status="loading" style="width: 100%;">
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
  </ore-state>
</div>

<script type="module">
  import '@vielzeug/refine/state';
  import '@vielzeug/refine/skeleton';
  import '@vielzeug/refine/table';
  import '@vielzeug/refine/button';

  const el = document.getElementById('members-state');
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

| `status`  | What renders                         | `aria-busy` | Announced by               |
| --------- | ------------------------------------ | ----------- | -------------------------- |
| `idle`    | nothing (empty region)               | `false`     | —                          |
| `loading` | `loading` slot or skeleton stack     | `true`      | `role="status"` (polite)   |
| `empty`   | `empty` slot or built-in placeholder | `false`     | `role="status"` (polite)   |
| `error`   | `error` slot or built-in placeholder | `false`     | `role="alert"` (assertive) |
| `success` | default slot (your content)          | `false`     | —                          |

## Props

| Attribute           | Type          | Default                  | Description                                           |
| ------------------- | ------------- | ------------------------ | ----------------------------------------------------- |
| `status`            | `StateStatus` | `'success'`              | Current data-fetch status                             |
| `empty-label`       | `string`      | `'No content yet'`       | Heading for the built-in empty state                  |
| `empty-description` | `string`      | N/A                      | Description below the empty-state heading             |
| `error-label`       | `string`      | `'Something went wrong'` | Heading for the built-in error state                  |
| `error-description` | `string`      | N/A                      | Description below the error-state heading             |
| `retryable`         | `boolean`     | `false`                  | Show a retry button when error has no slotted actions |

## Events

| Event   | Detail | Description                                     |
| ------- | ------ | ----------------------------------------------- |
| `retry` | N/A    | Fired when the built-in retry button is clicked |

## Slots

| Slot           | Description                                                    |
| -------------- | -------------------------------------------------------------- |
| _(default)_    | Rendered when `status="success"`                               |
| `loading`      | Replaces the built-in skeleton stack during loading            |
| `empty`        | Replaces the built-in empty placeholder whole                  |
| `error`        | Replaces the built-in error placeholder whole                  |
| `illustration` | Swaps the artwork in the built-in empty/error placeholder      |
| `actions`      | Recovery controls for the built-in placeholder, below its text |

## CSS Custom Properties

| Property            | Default                | Description                             |
| ------------------- | ---------------------- | --------------------------------------- |
| `--state-color`     | `--color-contrast-500` | Icon/text color for built-in states     |
| `--state-icon-size` | `var(--size-12)`       | Icon size in built-in empty/error views |
| `--state-gap`       | `var(--size-3)`        | Gap between elements in built-in views  |

## Accessibility

`ore-state` keeps the announced copy and the recovery controls in separate regions. The host carries only `aria-busy` (`"true"` while `status` is `loading`), because a roleless host cannot take `aria-label` and an `aria-live` on the host would wrap the default slot and announce every change inside your success content.

Announcements come from the regions that carry a role: the loading region is `role="status"` (polite), the empty placeholder is `role="status"`, and the error placeholder is `role="alert"` (assertive). The built-in retry button sits outside those live regions, since focusable content inside a live region is dropped by some screen readers. It is typed `type="button"` to prevent accidental form submission.
