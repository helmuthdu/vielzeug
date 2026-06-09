---
title: Checkbox Group
---

`sg-checkbox-group` is a form-associated fieldset wrapper for `sg-checkbox` items. It owns the selection state for all child checkboxes, mirrors that state into the `values` attribute as a comma-separated string, and submits that string under the group's `name` in native forms and `sg-form`.

## Features

- Form-associated group submission through `name`
- Comma-separated `values` state for preselection and controlled updates
- Propagation of `color`, `size`, and `disabled` to child `sg-checkbox` elements
- `fieldset` and `legend` semantics with helper and error text wiring
- Vertical and horizontal layouts

## Source Code

::: details View Checkbox Group Source
<<< @/../packages/sigil/src/inputs/checkbox-group/checkbox-group.ts
:::

## Basic Usage

```html
<sg-checkbox-group label="Interests" values="sport,music">
  <sg-checkbox value="sport">Sport</sg-checkbox>
  <sg-checkbox value="music">Music</sg-checkbox>
  <sg-checkbox value="travel">Travel</sg-checkbox>
</sg-checkbox-group>
```

## Form Submission

Set `name` on the group when you want its selected values to submit with a form. The submitted value is a comma-separated string such as `email,sms`.

```html
<sg-form id="prefs-form" novalidate>
  <sg-checkbox-group name="contact" label="Preferred contact" values="email,sms">
    <sg-checkbox value="email">Email</sg-checkbox>
    <sg-checkbox value="phone">Phone</sg-checkbox>
    <sg-checkbox value="sms">SMS</sg-checkbox>
  </sg-checkbox-group>
  <sg-button type="submit">Save Preferences</sg-button>
</sg-form>

<script type="module">
  import '@vielzeug/sigil/form';
  import '@vielzeug/sigil/checkbox-group';
  import '@vielzeug/sigil/checkbox';
  import '@vielzeug/sigil/button';

  document.getElementById('prefs-form').addEventListener('submit', (e) => {
    console.log('contact:', e.detail.formData.get('contact'));
  });
</script>
```

## Orientation

```html
<sg-checkbox-group label="Notifications (vertical)">
  <sg-checkbox value="email">Email</sg-checkbox>
  <sg-checkbox value="push">Push</sg-checkbox>
  <sg-checkbox value="sms">SMS</sg-checkbox>
</sg-checkbox-group>

<sg-checkbox-group label="Working days (horizontal)" orientation="horizontal" values="mon,wed,fri">
  <sg-checkbox value="mon">Mon</sg-checkbox>
  <sg-checkbox value="tue">Tue</sg-checkbox>
  <sg-checkbox value="wed">Wed</sg-checkbox>
  <sg-checkbox value="thu">Thu</sg-checkbox>
  <sg-checkbox value="fri">Fri</sg-checkbox>
</sg-checkbox-group>
```

## Validation Feedback

```html
<sg-checkbox-group label="Interests" helper="Select all that apply.">
  <sg-checkbox value="sport">Sport</sg-checkbox>
  <sg-checkbox value="music">Music</sg-checkbox>
  <sg-checkbox value="travel">Travel</sg-checkbox>
</sg-checkbox-group>

<sg-checkbox-group label="Agreements" error="Please accept all required policies." color="error">
  <sg-checkbox value="terms">I accept the terms of service</sg-checkbox>
  <sg-checkbox value="privacy">I accept the privacy policy</sg-checkbox>
</sg-checkbox-group>
```

## API Reference

- `label`: `string`, default `''`. Legend text used as the group's accessible name.
- `values`: `string`, default `''`. Comma-separated currently checked values.
- `name`: `string`, default `''`. Form field name used during submission.
- `orientation`: `'vertical' | 'horizontal'`, default `'vertical'`. Layout direction of options.
- `color`: `'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'`. Propagated to child checkboxes.
- `size`: `'sm' | 'md' | 'lg'`. Propagated to child checkboxes.
- `disabled`: `boolean`, default `false`. Disables all checkboxes in the group.
- `required`: `boolean`, default `false`. Marks the group as required for accessibility and validation.
- `error`: `string`, default `''`. Error message shown below the group.
- `helper`: `string`, default `''`. Helper text shown below the group when no error is present.

## Events

| Event    | Detail                 | Description                                             |
| -------- | ---------------------- | ------------------------------------------------------- |
| `change` | `{ values: string[] }` | Full array of currently checked values after any toggle |

## Best Practices

- Put `name` on the group instead of individual child checkboxes when you want one submitted field.
- Update `values`, not child `checked` attributes, when you want to control the group from outside.
- Use `sg-radio-group` instead when the user must pick exactly one option.
