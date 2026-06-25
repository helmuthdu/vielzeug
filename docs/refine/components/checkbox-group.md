---
title: Checkbox Group
---

`ore-checkbox-group` is a form-associated fieldset wrapper for `ore-checkbox` items. It owns the selection state for all child checkboxes, mirrors that state into the `values` attribute as a comma-separated string, and submits that string under the group's `name` in native forms and `ore-form`. Use `ore-radio-group` instead when the user must pick exactly one option.

## Form Submission

Set `name` on the group — not on individual child checkboxes — when you want its selected values to submit with a form. The submitted value is a comma-separated string such as `email,sms`.

```html
<ore-form id="prefs-form" novalidate>
  <ore-checkbox-group name="contact" label="Preferred contact" values="email,sms">
    <ore-checkbox value="email">Email</ore-checkbox>
    <ore-checkbox value="phone">Phone</ore-checkbox>
    <ore-checkbox value="sms">SMS</ore-checkbox>
  </ore-checkbox-group>
  <ore-button type="submit">Save Preferences</ore-button>
</ore-form>

<script type="module">
  import '@vielzeug/refine/form';
  import '@vielzeug/refine/checkbox-group';
  import '@vielzeug/refine/checkbox';
  import '@vielzeug/refine/button';

  document.getElementById('prefs-form').addEventListener('submit', (e) => {
    console.log('contact:', e.detail.formData.get('contact'));
  });
</script>
```

## Orientation

```html
<ore-checkbox-group label="Notifications (vertical)">
  <ore-checkbox value="email">Email</ore-checkbox>
  <ore-checkbox value="push">Push</ore-checkbox>
  <ore-checkbox value="sms">SMS</ore-checkbox>
</ore-checkbox-group>

<ore-checkbox-group label="Working days (horizontal)" orientation="horizontal" values="mon,wed,fri">
  <ore-checkbox value="mon">Mon</ore-checkbox>
  <ore-checkbox value="tue">Tue</ore-checkbox>
  <ore-checkbox value="wed">Wed</ore-checkbox>
  <ore-checkbox value="thu">Thu</ore-checkbox>
  <ore-checkbox value="fri">Fri</ore-checkbox>
</ore-checkbox-group>
```

## Validation Feedback

```html
<ore-checkbox-group label="Interests" helper="Select all that apply.">
  <ore-checkbox value="sport">Sport</ore-checkbox>
  <ore-checkbox value="music">Music</ore-checkbox>
  <ore-checkbox value="travel">Travel</ore-checkbox>
</ore-checkbox-group>

<ore-checkbox-group label="Agreements" error="Please accept all required policies." color="error">
  <ore-checkbox value="terms">I accept the terms of service</ore-checkbox>
  <ore-checkbox value="privacy">I accept the privacy policy</ore-checkbox>
</ore-checkbox-group>
```

## API Reference

- `label`: `string`, default `''`. Legend text used as the group's accessible name.
- `values`: `string`, default `''`. Comma-separated currently checked values. Update `values`, not child `checked` attributes, when controlling the group from outside.
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
