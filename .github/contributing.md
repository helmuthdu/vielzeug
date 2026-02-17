# Contributing to Vielzeug

Thank you for your interest in contributing to Vielzeug! 🎉

This guide will help you get started. We appreciate all contributions, from fixing typos to adding new features.

## Table of Contents

- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Making Changes](#making-changes)
- [Code Guidelines](#code-guidelines)
- [Submitting Your Work](#submitting-your-work)
- [Need Help?](#need-help)

## Quick Start

### Prerequisites

- **Node.js**: v22+ (use `nvm` to manage versions)
- **pnpm**: v10+ (install via `npm install -g pnpm`)

### Setup

```bash
# 1. Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/vielzeug.git
cd vielzeug

# 2. Install dependencies
pnpm install

# 3. Build everything
pnpm build

# 4. Run tests to verify setup
pnpm test
```

✅ You're ready to contribute!

## Development Workflow

### Working on a Package

```bash
# Navigate to the package
cd packages/deposit

# Run tests in watch mode
pnpm test

# Build the package
pnpm build

# Lint your code
pnpm lint
```

### Running Documentation Site

```bash
# Start dev server
pnpm docs:dev

# Build docs
pnpm docs:build
```

### Common Commands

```bash
# Build all packages
pnpm build

# Test everything
pnpm test

# Lint everything
pnpm lint

# Fix linting issues
pnpm fix
```

## Making Changes

### 1. Pick an Issue

- Browse [open issues](https://github.com/helmuthdu/vielzeug/issues)
- Look for `good first issue` or `help wanted` labels
- Comment on the issue to claim it

### 2. Create a Branch

```bash
git checkout -b feat/my-new-feature
# or
git checkout -b fix/bug-description
```

### 3. Make Your Changes

**Keep it simple:**
- Write clear, readable code
- Add tests for new features
- Update documentation if needed
- Follow existing code style

### 4. Test Your Changes

```bash
# Run tests
pnpm test

# Check types
pnpm build

# Lint code
pnpm lint
```

## Code Guidelines

### TypeScript Style

```typescript
// ✅ Good
export function formatName(first: string, last: string): string {
  return `${first} ${last}`;
}

// ❌ Avoid
export function formatName(first: any, last: any) {
  return first + ' ' + last;
}
```

**Key points:**
- Use TypeScript (no `any` types)
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use descriptive names

### Testing

```typescript
// Simple and clear
describe('formatName', () => {
  it('should combine first and last name', () => {
    const result = formatName('John', 'Doe');
    expect(result).toBe('John Doe');
  });

  it('should throw error for empty names', () => {
    expect(() => formatName('', '')).toThrow();
  });
});
```

**Key points:**
- Test new features
- Use descriptive test names
- Test edge cases

### Documentation

**When adding features:**
1. Update the package README
2. Add usage examples
3. Update API docs if needed

**Use the PackageInfo and PackageBadges components:**
```markdown
<!-- In docs -->
<PackageBadges package="deposit" />

<!-- Inline usage -->
Only <PackageInfo package="deposit" type="size" /> gzipped!
```

## Submitting Your Work

### 1. Commit Your Changes

Use clear, descriptive commit messages:

```bash
# Format: <type>(<package>): <description>

git commit -m "feat(deposit): add TTL support for records"
git commit -m "fix(fetchit): correct timeout handling"
git commit -m "docs(formit): update validation examples"
```

**Common types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code cleanup
- `test`: Tests
- `chore`: Maintenance

### 2. Push to Your Fork

```bash
git push origin your-branch-name
```

### 3. Open a Pull Request

1. Go to the [Vielzeug repository](https://github.com/helmuthdu/vielzeug)
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill out the PR template:
   - Describe your changes
   - Link related issues
   - Note any breaking changes

### 4. Respond to Feedback

- Check your PR for review comments
- Make requested changes
- Push updates to the same branch

## Project Structure

```
vielzeug/
├── packages/           # All packages
│   ├── craftit/       # Web components
│   ├── deposit/       # Client-side storage
│   ├── fetchit/       # HTTP client
│   ├── formit/        # Form management
│   ├── i18nit/        # Internationalization
│   ├── logit/         # Logging
│   ├── permit/        # Permissions
│   ├── routeit/       # Routing
│   ├── snapit/       # State management
│   ├── toolkit/       # Utilities
│   ├── validit/       # Validation
│   └── wireit/        # Dependency injection
└── docs/              # VitePress documentation
```

**Each package has:**
- `src/` - Source code
- `src/*.test.ts` - Tests
- `README.md` - Package documentation
- `package.json` - Package config

## Need Help?

- 💬 **Questions?** [Start a discussion](https://github.com/helmuthdu/vielzeug/discussions)
- 🐛 **Found a bug?** [Open an issue](https://github.com/helmuthdu/vielzeug/issues)
- 📖 **Documentation:** [vielzeug.dev](https://helmuthdu.github.io/vielzeug)

## Code of Conduct

Be respectful and constructive in all interactions. We're all here to build something great together! 🤝

## Recognition

All contributors are recognized in:
- Release notes
- Package changelogs
- GitHub contributors page

Thank you for contributing! 🙏
