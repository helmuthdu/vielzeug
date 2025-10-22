# Permit Examples

Here are some practical examples of using the permit package.

## Basic Registration and Check

```ts
Permit.register('admin', 'posts', { view: true, create: true });
const user = { id: '1', roles: ['admin'] };
Permit.check(user, 'posts', 'view'); // true
Permit.check(user, 'posts', 'delete'); // false
```

## Dynamic Permissions

```ts
Permit.register('editor', 'posts', {
  update: (user, data) => user.id === data.authorId,
});
const user = { id: '2', roles: ['editor'] };
Permit.check(user, 'posts', 'update', { authorId: '2' }); // true
Permit.check(user, 'posts', 'update', { authorId: '3' }); // false
```

## Wildcard Roles and Resources

```ts
Permit.register('*', '*', { view: true });
const user = { id: '3', roles: ['guest'] };
Permit.check(user, 'comments', 'view'); // true
```

## Clearing and Inspecting Permissions

```ts
Permit.clear();
Permit.roles; // Map of all roles and permissions
```
