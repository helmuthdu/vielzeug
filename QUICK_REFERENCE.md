# Quick Reference: Release Commands

## GitHub Actions (Recommended)

### Release a Package
1. Go to: **Actions** → **Release Package** → **Run workflow**
2. Enter:
   - Package: `@vielzeug/toolkit` (or any package)
   - Bump: `patch` | `minor` | `major`
3. Click **Run workflow**

## Local Testing

### Create Change File
```bash
# For all changed packages
rush change --bulk --bump-type patch --message "Your message"

# Interactive (prompts for each package)
rush change
```

### Preview Changes
```bash
# Dry run - shows what will happen
rush publish
```

### Publish Locally
```bash
# Set auth token
export NPM_AUTH_TOKEN=your-npm-token

# Publish to npm
rush publish --apply --publish --set-access-level public
```

## Useful Commands

### List All Packages
```bash
rush list
```

### List Packages in Version Policy
```bash
rush list --to-version-policy vielzeug-packages
```

### Build Specific Package
```bash
rush build --to @vielzeug/toolkit
```

### Build All Packages
```bash
rush build
```

## Version Bump Types

| Type | Example | When to Use |
|------|---------|-------------|
| `patch` | 1.0.0 → 1.0.1 | Bug fixes, small updates |
| `minor` | 1.0.0 → 1.1.0 | New features (backwards compatible) |
| `major` | 1.0.0 → 2.0.0 | Breaking changes |

## Quick Troubleshooting

### "No changes detected"
- Make changes to package files first
- Or specify a specific package with change files

### "Authentication failed"
- Set NPM_TOKEN secret in GitHub
- Or export NPM_AUTH_TOKEN locally

### "Version already exists"
- Version already published to npm
- Use a higher bump type or update version manually

## Package Status

All configured packages:
- ✅ `@vielzeug/deposit`
- ✅ `@vielzeug/fetchit`
- ✅ `@vielzeug/logit`
- ✅ `@vielzeug/permit`
- ✅ `@vielzeug/toolkit`

## Links

- **NPM Registry**: https://www.npmjs.com/settings/[username]/packages
- **GitHub Actions**: https://github.com/helmuthdu/vielzeug/actions
- **Rush Documentation**: https://rushjs.io/

---

**Tip**: Start with a `patch` bump on a test package to verify everything works!

