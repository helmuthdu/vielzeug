---
title: Checkbox Group
---

`bit-checkbox-group` is a form-associated fieldset wrapper for `bit-checkbox` items. It owns the selection state for all child checkboxes, mirrors that state into the `values` attribute as a comma-separated string, and submits that string under the group's `name` in native forms and `bit-form`.

## Features

- Form-associated group submission through `name`
- Comma-separated `values` state for preselection and controlled updates
- Propagation of `color`, `size`, and `disabled` to child `bit-checkbox` elements
- `fieldset` and `legend` semantics with helper and error text wiring
- Vertical and horizontal layouts

## Source Code

::: details View Checkbox Group Source
<<< @/../packages/buildit/src/inputs/checkbox-group/checkbox-group.ts
:::

## Basic Usage

```html
<bit-checkbox-group label="Interests" values="sport,music">
  <bit-checkbox value="sport">Sport</bit-checkbox>
  <bit-checkbox value="music">Music</bit-checkbox>
  <bit-checkbox value="travel">Travel</bit-checkbox>
</bit-checkbox-group>

<script type="module">
  import '@vielzeug/buildit/checkbox-group';
  import '@vielzeug/buildit/checkbox';
</script>
```

## Form Submission

Set `name` on the group when you want its selected values to submit with a form. The submitted value is a comma-separated string such as `email,sms`.

```html
<bit-form id="prefs-form" novalidate>
  <bit-checkbox-group name="contact" label="Preferred contact" values="email,sms">
    <bit-checkbox value="email">Email</bit-checkbox>
    <bit-checkbox value="phone">Phone</bit-checkbox>
    <bit-checkbox value="sms">SMS</bit-checkbox>
  </bit-checkbox-group>
  <bit-button type="submit">Save Preferences</bit-button>
</bit-form>

<script type="module">
  import '@vielzeug/buildit/form';
  import '@vielzeug/buildit/checkbox-group';
  import '@vielzeug/buildit/checkbox';
  import '@vielzeug/buildit/button';

  document.getElementById('prefs-form').addEventListener('submit', (e) => {
    console.log('contact:', e.detail.formData.get('contact'));
  });
</script>
```

## Orientation

```html
<bit-checkbox-group label="Notifications (vertical)">
  <bit-checkbox value="email">Email</bit-checkbox>
  <bit-checkbox value="push">Push</bit-checkbox>
  <bit-checkbox value="sms">SMS</bit-checkbox>
</bit-checkbox-group>

<bit-checkbox-group label="Working days (horizontal)" orientation="horizontal" values="mon,wed,fri">
  <bit-checkbox value="mon">Mon</bit-checkbox>
  <bit-checkbox value="tue">Tue</bit-checkbox>
  <bit-checkbox value="wed">Wed</bit-checkbox>
  <bit-checkbox value="thu">Thu</bit-checkbox>
  <bit-checkbox value="fri">Fri</bit-checkbox>
</bit-checkbox-group>
```

## Validation Feedback

```html
<bit-checkbox-group label="Interests" helper="Select all that apply.">
  <bit-checkbox value="sport">Sport</bit-checkbox>
  <bit-checkbox value="music">Music</bit-checkbox>
  <bit-checkbox value="travel">Travel</bit-checkbox>
</bit-checkbox-group>

<bit-checkbox-group label="Agreements" error="Please accept all required policies." color="error">
  <bit-checkbox value="terms">I accept the terms of service</bit-checkbox>
  <bit-checkbox value="privacy">I accept the privacy policy</bit-checkbox>
</bit-checkbox-group>
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
- Use `bit-radio-group` instead when the user must pick exactly one option.
