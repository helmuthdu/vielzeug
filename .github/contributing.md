# Contributing to Vielzeug

Thank you for investing your time in contributing to Vielzeug! 🎉
We appreciate all contributions, from fixing typos to adding new features. This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Guidelines](#documentation-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- **Node.js**: v18+ (use `nvm` to manage versions)
- **pnpm**: v8+ (install via `npm install -g pnpm`)
- **Git**: Latest version

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vielzeug.git
   cd vielzeug
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/helmuthdu/vielzeug.git
   ```
4. **Install dependencies** using Rush:
   ```bash
   pnpm install
   ```
5. **Build all packages**:
   ```bash
   rush build
   ```
6. **Run tests** to verify setup:
   ```bash
   rush test
   ```

## How to Contribute

### 🤔 Have a Question?

- Check the [documentation](https://vielzeug.dev)
- Search [existing discussions](https://github.com/helmuthdu/vielzeug/discussions)
- Start a new discussion if your question hasn't been answered

### 🐛 Found a Bug?

1. Search [existing issues](https://github.com/helmuthdu/vielzeug/issues) to avoid duplicates
2. If not found, [create a new issue](https://github.com/helmuthdu/vielzeug/issues/new) with:
    - Clear, descriptive title
    - Steps to reproduce the bug
    - Expected vs actual behavior
    - Environment details (Node version, OS, etc.)
    - Code snippets or minimal reproduction

### 💡 Want a New Feature?

1. Search [existing issues](https://github.com/helmuthdu/vielzeug/issues) and [discussions](https://github.com/helmuthdu/vielzeug/discussions)
2. Open a discussion to propose the feature and get feedback
3. Once approved, create an issue with detailed requirements
4. Wait for maintainer approval before starting implementation

### 🔧 Ready to Code?

1. Look through [open issues](https://github.com/helmuthdu/vielzeug/issues)
2. Pick an issue labeled `good first issue` or `help wanted`
3. Comment on the issue to let others know you're working on it
4. Fork the repo and create a branch for your changes

## Development Workflow

### Working on a Package

```bash
# Navigate to the package directory
cd packages/toolkit
# Install dependencies (if needed)
rush update
# Build the package
rush build --to .
# Run tests for this package
pnpm test
# Run tests in watch mode
pnpm test:watch
# Lint the code
pnpm lint
# Type check
pnpm type-check
```

### Working on Multiple Packages

```bash
# Build all packages
rush build
# Build specific packages
rush build --to @vielzeug/toolkit
rush build --to @vielzeug/formit
# Test all packages
rush test
# Lint all packages
rush lint
```

### Running the Documentation Site

```bash
# Start the dev server
pnpm docs:dev
# Build the docs
pnpm docs:build
# Preview the built docs
pnpm docs:preview
```

## Project Structure

```
vielzeug/
├── .github/              # GitHub workflows, templates
├── common/               # Rush configuration
├── docs/                 # VitePress documentation
│   ├── deposit/
│   ├── fetchit/
│   ├── formit/
│   ├── i18nit/
│   ├── logit/
│   ├── permit/
│   ├── toolkit/
│   └── validit/
├── packages/             # All library packages
│   ├── deposit/          # LocalStorage/IndexedDB abstraction
│   ├── fetchit/          # HTTP client with caching
│   ├── formit/           # Form state management
│   ├── i18nit/           # Internationalization
│   ├── logit/            # Logging utility
│   ├── permit/           # Permission management
│   ├── toolkit/          # Utility functions
│   └── validit/          # Schema validation
├── package.json
├── rush.json             # Rush monorepo configuration
└── tsconfig.json
```

### Package Structure

Each package follows this structure:

```
packages/[package-name]/
├── src/
│   ├── [package-name].ts    # Main source file
│   ├── [package-name].test.ts  # Tests
│   └── index.ts             # Public exports
├── CHANGELOG.json
├── CHANGELOG.md
├── package.json
├── README.md
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Code Style Guidelines

### TypeScript

- Use **TypeScript** for all code
- Prefer **type** over **interface** for simple types
- Use **explicit return types** for public APIs
- Avoid **any** - use **unknown** if type is truly unknown
- Use **strict mode** (already enabled in tsconfig)

### Naming Conventions

- **Variables/Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE` (for true constants)
- **Files**: `kebab-case.ts` or `camelCase.ts` (be consistent within package)
- **Private members**: Prefix with `#` (private fields) or `_` (private methods)

### Code Organization

- **Keep functions small** and focused (single responsibility)
- **Extract magic numbers** into named constants
- **Add JSDoc comments** for public APIs
- **Group related code** together
- **Avoid deep nesting** (max 3 levels)

### Example

```typescript
/**
 * Formats a user's full name
 * @param firstName - The user's first name
 * @param lastName - The user's last name
 * @returns The formatted full name
 */
export function formatFullName(firstName: string, lastName: string): string {
  if (!firstName || !lastName) {
    throw new Error('First name and last name are required');
  }
  return `${firstName} ${lastName}`;
}
```

## Testing Guidelines

### General Rules

- **Write tests for all new code** (aim for 100% coverage)
- **Use descriptive test names** (describe what's being tested)
- **Follow AAA pattern**: Arrange, Act, Assert
- **Test edge cases** and error scenarios
- **Keep tests isolated** (no shared state between tests)

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './my-function';
describe('myFunction', () => {
  it('should return expected result for valid input', () => {
    // Arrange
    const input = 'test';
    // Act
    const result = myFunction(input);
    // Assert
    expect(result).toBe('expected');
  });
  it('should throw error for invalid input', () => {
    // Arrange
    const invalidInput = null;
    // Act & Assert
    expect(() => myFunction(invalidInput)).toThrow('Invalid input');
  });
});
```

### Running Tests

```bash
# Run all tests
rush test
# Run tests for a specific package
cd packages/toolkit && pnpm test
# Run tests in watch mode
pnpm test:watch
# Run tests with coverage
pnpm test:coverage
```

## Documentation Guidelines

### Code Documentation

- Add **JSDoc comments** for all exported functions, classes, and types
- Include **@param** and **@returns** tags
- Add **@example** for complex functions
- Document **edge cases** and **limitations**

### User Documentation

When adding features or making changes:

1. **Update the package README** (`packages/[name]/README.md`)
2. **Update usage docs** (`docs/[name]/usage.md`)
3. **Add examples** (`docs/[name]/examples.md`)
4. **Update API reference** (`docs/[name]/api.md`)

### Documentation Structure

- **Usage Guide**: How to use the feature (basics to advanced)
- **Examples**: Real-world use cases and code samples
- **API Reference**: Complete API documentation

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Format

```
<type>(<scope>): <subject>
<body>
<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring (no functional changes)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Build system or dependency changes
- **ci**: CI/CD configuration changes
- **chore**: Other changes (e.g., updating dependencies)

### Scopes

Use the package name as scope:

- `deposit`
- `fetchit`
- `formit`
- `i18nit`
- `logit`
- `permit`
- `toolkit`
- `validit`
- `docs`
- `ci`

### Examples

```bash
feat(toolkit): add debounce utility function
fix(formit): correct validation error messages
docs(fetchit): update usage examples for query client
refactor(validit): simplify schema validation logic
test(deposit): add tests for IndexedDB adapter
```

## Pull Request Process

### Before Submitting

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
2. **Create a change file** (required for versioning):
   ```bash
   rush change
   ```

    - Select the affected package(s)
    - Choose change type (patch/minor/major)
    - Write a clear description of changes
3. **Run all checks**:
   ```bash
   rush build
   rush test
   rush lint
   ```
4. **Update documentation** (if applicable)
5. **Self-review your code**:
    - Remove debug code and console.logs
    - Check for typos and formatting
    - Ensure comments are clear and helpful

### Submitting Your PR

1. **Push to your fork**:
   ```bash
   git push origin your-branch-name
   ```
2. **Open a Pull Request** to the `main` branch
3. **Fill out the PR template** completely:
    - Clear description of changes
    - Link to related issue(s)
    - Screenshots (if UI changes)
    - Breaking changes (if any)
4. **Enable "Allow edits from maintainers"**
5. **Respond to review feedback** promptly

### PR Requirements

- ✅ All CI checks pass
- ✅ Tests maintain 100% coverage
- ✅ Documentation updated
- ✅ Change file created
- ✅ No merge conflicts
- ✅ PR template filled out

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **Patch** (0.0.x): Bug fixes, small improvements
- **Minor** (0.x.0): New features, non-breaking changes
- **Major** (x.0.0): Breaking changes

### Release Workflow

1. **Maintainer creates change files**: Contributors run `rush change`
2. **Rush updates versions**: Based on change files
3. **GitHub Action publishes**: Automatically to NPM
4. **Release notes**: Generated from change files

### Prerelease Versions

PRs labeled `prerelease` are published as beta/next versions:

- **Beta**: `1.2.3-beta.1` (for testing new features)
- **Next**: `1.2.3-next.1` (for canary releases)
  Bug fixes are NOT published as prereleases.

## Getting Help

- 💬 [GitHub Discussions](https://github.com/helmuthdu/vielzeug/discussions) - Ask questions
- 🐛 [GitHub Issues](https://github.com/helmuthdu/vielzeug/issues) - Report bugs
- 📖 [Documentation](https://vielzeug.dev) - Read the docs

## Recognition

Contributors are recognized in:

- Release notes
- Package CHANGELOGs
- GitHub contributors list
  Thank you for contributing to Vielzeug! 🙏
