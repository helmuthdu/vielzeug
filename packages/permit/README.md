# @vielzeug/permit

Type-safe, flexible role-based access control (RBAC) system for TypeScript applications. Simple, powerful permission management with zero dependencies.

## Features

- ✅ **Type-Safe** - Full TypeScript support with generic user and data types
- ✅ **Flexible Permissions** - Static boolean or dynamic function-based checks
- ✅ **Wildcard Support** - Define permissions for all roles or resources
- ✅ **Normalized Matching** - Case-insensitive, trimmed role/resource comparison
- ✅ **Security-First** - Safe handling of malformed users with ANONYMOUS role
- ✅ **Runtime Validation** - Validates permission actions at registration
- ✅ **Zero Dependencies** - Lightweight with only @vielzeug/logit for optional logging
- ✅ **Deep Copy Protection** - Immutable permission registry inspection
- ✅ **Framework Agnostic** - Works with any JavaScript/TypeScript framework

## Installation

```bash
# pnpm
pnpm add @vielzeug/permit

# npm
npm install @vielzeug/permit

# yarn
yarn add @vielzeug/permit
```

## Quick Start

```typescript
import { Permit } from '@vielzeug/permit';

// Define permissions
Permit.register('admin', 'posts', {
  view: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('editor', 'posts', {
  view: true,
  create: true,
  update: (user, data) => user.id === data.authorId, // Dynamic check
  delete: false,
});

// Check permissions
const user = { id: '123', roles: ['editor'] };

Permit.check(user, 'posts', 'view'); // true
Permit.check(user, 'posts', 'create'); // true
Permit.check(user, 'posts', 'update', { authorId: '123' }); // true
Permit.check(user, 'posts', 'update', { authorId: '456' }); // false
Permit.check(user, 'posts', 'delete'); // false
```

## Core Concepts

### Permission Actions

Four standard CRUD actions are supported:
- `view` - Read/view access
- `create` - Create new resources
- `update` - Modify existing resources
- `delete` - Remove resources

### Permission Types

#### Static Permissions (Boolean)
```typescript
Permit.register('admin', 'posts', {
  view: true,  // Always allowed
  delete: false, // Always denied
});
```

#### Dynamic Permissions (Function)
```typescript
Permit.register('editor', 'posts', {
  update: (user, data) => {
    // Only allow if user owns the post
    return user.id === data.authorId;
  },
});

// Function permissions require data parameter
Permit.check(user, 'posts', 'update', { authorId: '123' }); // true/false
Permit.check(user, 'posts', 'update'); // false (no data provided)
```

### Wildcards

#### Wildcard Role - Apply to All Users
```typescript
import { WILDCARD } from '@vielzeug/permit';

// All users can view posts
Permit.register(WILDCARD, 'posts', { view: true });

const anyUser = { id: '999', roles: ['guest'] };
Permit.check(anyUser, 'posts', 'view'); // true
```

#### Wildcard Resource - Apply to All Resources
```typescript
// Admins can view everything
Permit.register('admin', WILDCARD, { view: true });

const admin = { id: '1', roles: ['admin'] };
Permit.check(admin, 'posts', 'view'); // true
Permit.check(admin, 'comments', 'view'); // true
Permit.check(admin, 'anything', 'view'); // true
```

#### Precedence
Specific permissions override wildcard permissions:
```typescript
Permit.register('admin', WILDCARD, { view: true });
Permit.register('admin', 'secrets', { view: false });

const admin = { id: '1', roles: ['admin'] };
Permit.check(admin, 'posts', 'view'); // true (wildcard)
Permit.check(admin, 'secrets', 'view'); // false (specific override)
```

### Anonymous Users

Use the `ANONYMOUS` role for unauthenticated users:

```typescript
import { ANONYMOUS } from '@vielzeug/permit';

// Public read access
Permit.register(ANONYMOUS, 'posts', { view: true });

// Malformed users are treated as anonymous
const malformedUser = null;
Permit.check(malformedUser, 'posts', 'view'); // true
```

### Normalization

All roles and resources are normalized (trimmed and lowercased) to prevent mismatches:

```typescript
Permit.register('Admin', 'Posts', { view: true });

const user = { id: '1', roles: ['ADMIN'] };
Permit.check(user, 'posts', 'view'); // true
Permit.check(user, 'POSTS', 'view'); // true
Permit.check(user, '  posts  ', 'view'); // true
```

## API Reference

### Permit.register()

Register permissions for a role and resource.

```typescript
Permit.register<TUser, TData>(
  role: string,
  resource: string,
  actions: Partial<Record<PermissionAction, PermissionCheck<TUser, TData>>>
): void
```

**Parameters:**
- `role` - Role identifier (normalized)
- `resource` - Resource identifier (normalized)
- `actions` - Object mapping actions to permissions (boolean or function)

**Throws:**
- `Error` if role or resource is empty
- `Error` if invalid action is provided

**Example:**
```typescript
Permit.register('moderator', 'comments', {
  view: true,
  delete: (user, data) => {
    // Moderators can delete spam or their own comments
    return data.isSpam || user.id === data.authorId;
  },
});
```

**Behavior:**
- Merges with existing permissions (doesn't replace)
- Validates action keys at runtime
- Normalizes role and resource

---

### Permit.set()

Set permissions for a role and resource, optionally replacing existing ones.

```typescript
Permit.set<TUser, TData>(
  role: string,
  resource: string,
  actions: Partial<Record<PermissionAction, PermissionCheck<TUser, TData>>>,
  replace?: boolean
): void
```

**Parameters:**
- `role` - Role identifier
- `resource` - Resource identifier
- `actions` - Permission actions
- `replace` - If `true`, replaces existing; if `false`, merges (default: `false`)

**Example:**
```typescript
// Merge with existing
Permit.set('editor', 'posts', { view: true, create: true });

// Replace completely
Permit.set('editor', 'posts', { view: true }, true);
```

---

### Permit.check()

Check if a user has permission to perform an action.

```typescript
Permit.check<TUser, TData>(
  user: TUser,
  resource: string,
  action: PermissionAction,
  data?: TData
): boolean
```

**Parameters:**
- `user` - User object with `id` and `roles` properties
- `resource` - Resource identifier
- `action` - Permission action to check
- `data` - Optional contextual data for function-based permissions

**Returns:** `true` if allowed, `false` otherwise

**Example:**
```typescript
const user = { id: '123', roles: ['editor'] };

// Static check
Permit.check(user, 'posts', 'view'); // boolean

// Dynamic check with data
Permit.check(user, 'posts', 'update', { authorId: '123' }); // boolean
```

**Behavior:**
- First-match-wins policy (first allow grants access)
- Checks specific roles before wildcard
- Function permissions return `false` if data is undefined
- Malformed users treated as ANONYMOUS + WILDCARD

---

### Permit.unregister()

Remove permissions for a role and resource.

```typescript
Permit.unregister(
  role: string,
  resource: string,
  action?: PermissionAction
): void
```

**Parameters:**
- `role` - Role identifier
- `resource` - Resource identifier
- `action` - Optional specific action to remove

**Example:**
```typescript
// Remove specific action
Permit.unregister('editor', 'posts', 'delete');

// Remove all actions for resource
Permit.unregister('editor', 'posts');
```

**Behavior:**
- Automatically cleans up empty resource entries
- Automatically cleans up empty role entries
- Safe to call on non-existent permissions

---

### Permit.hasRole()

Check if a user has a specific role.

```typescript
Permit.hasRole(user: BaseUser, role: string): boolean
```

**Parameters:**
- `user` - User object
- `role` - Role to check for

**Returns:** `true` if user has the role, `false` otherwise

**Example:**
```typescript
const user = { id: '1', roles: ['admin', 'editor'] };

Permit.hasRole(user, 'admin'); // true
Permit.hasRole(user, 'ADMIN'); // true (normalized)
Permit.hasRole(user, 'moderator'); // false
```

**Behavior:**
- Case-insensitive comparison
- Returns `true` for ANONYMOUS if user is malformed

---

### Permit.clear()

Remove all registered permissions.

```typescript
Permit.clear(): void
```

**Example:**
```typescript
Permit.clear();
// All permissions removed
```

---

### Permit.roles (getter)

Get a deep copy of all registered permissions.

```typescript
get roles(): RolesWithPermissions
```

**Returns:** Deep copy of the permission registry

**Example:**
```typescript
const permissions = Permit.roles;

// Inspect structure
for (const [role, resources] of permissions) {
  console.log(`Role: ${role}`);
  for (const [resource, actions] of resources) {
    console.log(`  Resource: ${resource}`, actions);
  }
}
```

**Behavior:**
- Returns deep copy (modifications don't affect internal state)
- Useful for debugging and introspection

---

## Advanced Usage

### Multi-Role Users

Users with multiple roles get permissions from all their roles:

```typescript
Permit.register('admin', 'posts', { delete: true });
Permit.register('editor', 'posts', { update: true });

const user = { id: '1', roles: ['admin', 'editor'] };

Permit.check(user, 'posts', 'delete'); // true (from admin)
Permit.check(user, 'posts', 'update'); // true (from editor)
```

### Conditional Permissions

Complex business logic in function-based permissions:

```typescript
Permit.register('editor', 'posts', {
  update: (user, data) => {
    // Multiple conditions
    if (data.isLocked) return false;
    if (user.id === data.authorId) return true;
    if (data.isPublished && user.roles.includes('senior-editor')) return true;
    return false;
  },
});
```

### Type-Safe Permissions

Use TypeScript generics for type safety:

```typescript
interface User {
  id: string;
  roles: string[];
  department: string;
}

interface PostData {
  authorId: string;
  department: string;
  isPublished: boolean;
}

Permit.register<User, PostData>('editor', 'posts', {
  update: (user, data) => {
    // TypeScript knows the types
    return user.department === data.department && !data.isPublished;
  },
});

const user: User = { id: '1', roles: ['editor'], department: 'tech' };
const post: PostData = { authorId: '2', department: 'tech', isPublished: false };

Permit.check(user, 'posts', 'update', post); // Type-safe
```

### Permission Auditing

Inspect all registered permissions:

```typescript
function auditPermissions() {
  const permissions = Permit.roles;
  
  for (const [role, resources] of permissions) {
    console.log(`\nRole: ${role}`);
    
    for (const [resource, actions] of resources) {
      console.log(`  Resource: ${resource}`);
      
      for (const [action, permission] of Object.entries(actions)) {
        const type = typeof permission === 'function' ? 'dynamic' : 'static';
        console.log(`    ${action}: ${type}`);
      }
    }
  }
}
```

### Testing Permissions

```typescript
import { Permit, WILDCARD, ANONYMOUS } from '@vielzeug/permit';

describe('Permissions', () => {
  beforeEach(() => {
    Permit.clear(); // Clean slate
  });

  it('should allow admin to delete posts', () => {
    Permit.register('admin', 'posts', { delete: true });
    
    const admin = { id: '1', roles: ['admin'] };
    expect(Permit.check(admin, 'posts', 'delete')).toBe(true);
  });

  it('should deny non-owners from editing', () => {
    Permit.register('editor', 'posts', {
      update: (user, data) => user.id === data.authorId,
    });
    
    const editor = { id: '1', roles: ['editor'] };
    expect(Permit.check(editor, 'posts', 'update', { authorId: '2' })).toBe(false);
  });
});
```

## Security Considerations

### Malformed User Handling

Malformed users (missing `id` or `roles`) are treated as ANONYMOUS + WILDCARD:

```typescript
// Configure permissions for anonymous users
Permit.register(ANONYMOUS, 'posts', { view: true });

const malformed = null;
Permit.check(malformed, 'posts', 'view'); // true (has ANONYMOUS role)
Permit.check(malformed, 'posts', 'create'); // false
```

**Warning:** Malformed users also receive the WILDCARD role, so they'll inherit any wildcard permissions. Ensure wildcard permissions are intended for public access.

### Function Permission Requirements

Function-based permissions **require** data to evaluate:

```typescript
Permit.register('editor', 'posts', {
  update: (user, data) => user.id === data.authorId,
});

// Without data - always returns false
Permit.check(user, 'posts', 'update'); // false

// With data - evaluates function
Permit.check(user, 'posts', 'update', { authorId: '123' }); // true/false
```

### Allow-on-Any Policy

Permission checks use "allow on any true" policy:
- First matching allow grants access
- No explicit deny rules
- Absence of permission = deny

```typescript
Permit.register('role1', 'posts', { view: false });
Permit.register('role2', 'posts', { view: true });

const user = { id: '1', roles: ['role1', 'role2'] };
Permit.check(user, 'posts', 'view'); // true (role2 allows)
```

## Types

```typescript
// User type
export type BaseUser = {
  id: string;
  roles: string[];
};

// Permission actions
export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

// Permission check (static or dynamic)
export type PermissionCheck<T, D> = boolean | ((user: T, data: D) => boolean);

// Permission map for a resource
export type PermissionMap<T, D> = Partial<Record<PermissionAction, PermissionCheck<T, D>>>;

// Resource permissions map
export type ResourcePermissions<T, D> = Map<string, PermissionMap<T, D>>;

// Full permissions registry
export type RolesWithPermissions<T, D> = Map<string, ResourcePermissions<T, D>>;

// Constants
export const WILDCARD = '*';
export const ANONYMOUS = 'anonymous';
```

## Best Practices

### 1. Use Specific Roles First

Define specific role permissions before wildcards to ensure proper precedence:

```typescript
// Specific first
Permit.register('admin', 'secrets', { view: true });
Permit.register('user', 'secrets', { view: false });

// Then wildcards
Permit.register(WILDCARD, 'public', { view: true });
```

### 2. Validate Data in Functions

Always validate data exists before accessing properties:

```typescript
Permit.register('editor', 'posts', {
  update: (user, data) => {
    if (!data || !data.authorId) return false;
    return user.id === data.authorId;
  },
});
```

### 3. Use Type Parameters

Leverage TypeScript for type safety:

```typescript
interface MyUser extends BaseUser {
  department: string;
}

interface MyData {
  department: string;
}

Permit.register<MyUser, MyData>('manager', 'reports', {
  view: (user, data) => user.department === data.department,
});
```

### 4. Document Permission Logic

Add comments for complex permission rules:

```typescript
Permit.register('editor', 'posts', {
  update: (user, data) => {
    // Editors can update:
    // 1. Their own unpublished posts
    // 2. Published posts in their department (if senior)
    if (user.id === data.authorId && !data.isPublished) return true;
    if (data.department === user.department && user.isSenior) return true;
    return false;
  },
});
```

### 5. Use Constants for Roles

Define role constants for consistency:

```typescript
const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

Permit.register(ROLES.ADMIN, 'posts', { delete: true });
```

## Comparison

| Feature | @vielzeug/permit | casl | accesscontrol |
|---------|------------------|------|---------------|
| Bundle Size | **~2KB** | ~15KB | ~10KB |
| Dependencies | 1 (logging) | Multiple | 0 |
| TypeScript | First-class | Good | Basic |
| Dynamic Permissions | ✅ Functions | ✅ Conditions | ❌ |
| Normalization | ✅ Built-in | ❌ | ❌ |
| Wildcards | ✅ Role + Resource | ⚠️ Limited | ✅ |
| Type Exports | ✅ All types | ⚠️ Some | ❌ |
| Security Defaults | ✅ Safe malformed users | ⚠️ | ⚠️ |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Documentation](https://vielzeug.dev)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/permit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)

---

Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem - A collection of type-safe utilities for modern web development.

