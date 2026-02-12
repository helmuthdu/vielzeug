<div align="center">
  <img src="docs/public/logo-main.svg" alt="Vielzeug Logo" width="200"/>

# Vielzeug

**A collection of modern, type-safe utilities for JavaScript and TypeScript**

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/org/vielzeug)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/helmuthdu/vielzeug/pulls)

[Documentation](https://helmuthdu.github.io/vielzeug/) • [Examples](https://helmuthdu.github.io/vielzeug/examples/) • [Contributing](#contributing)

</div>

## What is Vielzeug?

**Vielzeug** (German for "many tools") is a comprehensive ecosystem of modern, type-safe utilities designed to simplify common development tasks. Each package is:

- ✅ **Type-Safe**: Built with TypeScript from the ground up
- ✅ **Zero Dependencies**: No external dependencies for maximum security and minimal bundle size
- ✅ **Framework Agnostic**: Works with React, Vue, Svelte, or vanilla JS
- ✅ **Tree-Shakeable**: Import only what you need
- ✅ **Well-Tested**: Comprehensive test coverage
- ✅ **Production Ready**: Battle-tested in real-world applications

## 📦 Packages

### [@vielzeug/formit](packages/formit) - Form State Management

Effortless, type-safe form state and validation for React and beyond. Minimal code, maximum power.

```bash
npm install @vielzeug/formit
```

**Key Features:**

- Type-safe form state with inferred types
- Field-level and form-level validation
- Reactive subscriptions
- Framework agnostic

[📖 Documentation](https://helmuthdu.github.io/vielzeug/formit/) • [Examples](https://helmuthdu.github.io/vielzeug/formit/examples)

---

### [@vielzeug/i18nit](packages/i18nit) - Internationalization

Lightweight, type-safe internationalization with pluralization, async loading, and framework-agnostic design.

```bash
npm install @vielzeug/i18nit
```

**Key Features:**

- Type-safe translations with autocomplete
- Pluralization and interpolation support
- Async translation loading
- Framework agnostic with React hooks
- Locale fallback support (2.4 KB gzipped)

[📖 Documentation](https://helmuthdu.github.io/vielzeug/i18nit/) • [Examples](https://helmuthdu.github.io/vielzeug/i18nit/examples)

---

### [@vielzeug/fetchit](packages/fetchit) - HTTP Client & Query Management

Modern, type-safe HTTP client with intelligent caching and query management.

```bash
npm install @vielzeug/fetchit
```

**Key Features:**

- Separate HTTP and Query clients for flexibility
- Smart caching with configurable staleness
- Request deduplication
- Automatic retry logic (3.4 KB gzipped)

[📖 Documentation](https://helmuthdu.github.io/vielzeug/fetchit/) • [Examples](https://helmuthdu.github.io/vielzeug/fetchit/examples)

---

### [@vielzeug/deposit](packages/deposit) - Browser Storage

Powerful, type-safe browser storage utility with unified API for IndexedDB and LocalStorage.

```bash
npm install @vielzeug/deposit
```

**Key Features:**

- Unified API for IndexedDB and LocalStorage
- Advanced querying and filtering
- Schema migrations
- TTL (Time-To-Live) support (4.4 KB gzipped)

[📖 Documentation](https://helmuthdu.github.io/vielzeug/deposit/) • [Examples](https://helmuthdu.github.io/vielzeug/deposit/examples)

---

### [@vielzeug/logit](packages/logit) - Logging Utility

Flexible, zero-dependency logging utility for browser and Node.js environments.

```bash
npm install @vielzeug/logit
```

**Key Features:**

- Multiple log levels with filtering
- Custom themes and colors
- Remote logging support
- Scoped loggers (2.4 KB gzipped)

[📖 Documentation](https://helmuthdu.github.io/vielzeug/logit/) • [Examples](https://helmuthdu.github.io/vielzeug/logit/examples)

---

### [@vielzeug/permit](packages/permit) - Permission Management

Flexible, type-safe permission and role management utility.

```bash
npm install @vielzeug/permit
```

**Key Features:**

- Role-based access control (RBAC)
- Dynamic rules with context
- Wildcard support
- Type-safe permission checks (2.0 KB gzipped)

[📖 Documentation](https://helmuthdu.github.io/vielzeug/logit/) • [Examples](https://helmuthdu.github.io/vielzeug/permit/examples)

---

### [@vielzeug/toolkit](packages/toolkit) - Utility Library

Comprehensive, type-safe utility library with 100+ helpers for modern JavaScript.

```bash
npm install @vielzeug/toolkit
```

**Key Features:**

- 100+ utilities for arrays, objects, strings, dates, and more
- Full TypeScript support with inference
- Tree-shakeable by design (0.1-0.5 KB per utility)
- Zero dependencies

[📖 Documentation](https://helmuthdu.github.io/vielzeug/toolkit/) • [Examples](https://helmuthdu.github.io/vielzeug/toolkit/examples)

---

### [@vielzeug/validit](packages/validit) - Schema Validation

Lightweight, type-safe schema validation with async support and zero dependencies.

```bash
npm install @vielzeug/validit
```

**Key Features:**

- Type-safe schema definitions with inference
- Async validation support
- Custom refinements and transforms
- Comprehensive error handling (2.8 KB gzipped)

[📖 Documentation](https://helmuthdu.github.io/vielzeug/validit/) • [Examples](https://helmuthdu.github.io/vielzeug/validit/examples)

---

### [@vielzeug/wireit](packages/wireit) - Dependency Injection

Type-safe dependency injection container with async support and scoped lifetimes.

```bash
npm install @vielzeug/wireit
```

**Key Features:**

- Type-safe container with token-based dependencies
- Async factory support
- Scoped lifetimes (singleton, transient, scoped)
- Testing helpers (2.1 KB gzipped)

[📖 Documentation](https://helmuthdu.github.io/vielzeug/wireit/) • [Examples](https://helmuthdu.github.io/vielzeug/wireit/examples)

## 🏁 Quick Start

### Installation

Install individual packages as needed:

```bash
# Using pnpm (recommended)
pnpm add @vielzeug/formit @vielzeug/fetchit

# Using npm
npm install @vielzeug/formit @vielzeug/fetchit

# Using yarn
yarn add @vielzeug/formit @vielzeug/fetchit
```

### Example: Complete Form with API Integration

```tsx
import { createForm } from '@vielzeug/formit';
import { createHttpClient } from '@vielzeug/fetchit';
import { Logit } from '@vielzeug/logit';

// Setup HTTP client
const http = createHttpClient({
  baseUrl: 'https://api.example.com',
});

// Create form with validation
const form = createForm({
  initialValues: { email: '', password: '' },
  fields: {
    email: {
      validators: (value) => {
        if (!value.includes('@')) return 'Invalid email';
      },
    },
    password: {
      validators: (value) => {
        if (value.length < 8) return 'Password too short';
      },
    },
  },
});

// Submit with logging
form.submit(async (values) => {
  try {
    const user = await http.post('/auth/login', values);
    Logit.success('Login successful!', user);
    return user;
  } catch (error) {
    Logit.error('Login failed:', error);
    throw error;
  }
});
```

## 🏗️ Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Setup

```bash
# Clone the repository
git clone https://github.com/helmuthdu/vielzeug.git
cd vielzeug

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start documentation site
pnpm docs:dev
```

### Project Structure

```
vielzeug/
├── packages/
│   ├── deposit/       # Browser storage utility
│   ├── fetchit/       # HTTP client & query management
│   ├── formit/        # Form state management
│   ├── i18nit/        # Internationalization
│   ├── logit/         # Logging utility
│   ├── permit/        # Permission management
│   ├── toolkit/       # Utility library
│   ├── validit/       # Schema validation
│   └── wireit/        # Dependency injection
├── docs/              # VitePress documentation
└── common/            # Shared configuration
```

### Scripts

```bash
pnpm build          # Build all packages
pnpm test           # Run tests
pnpm lint           # Lint code
pnpm fix            # Fix linting issues
pnpm docs:dev       # Start docs dev server
pnpm docs:build     # Build documentation
```

## 📊 Bundle Sizes

All sizes are measured as **minified + gzipped** production builds:

| Package           | Minified Size              | Gzipped Size  | Dependencies |
| ----------------- | -------------------------- | ------------- | ------------ |
| @vielzeug/deposit | **16 KB**                  | **4.4 KB**    | 2\*          |
| @vielzeug/fetchit | **10 KB**                  | **3.4 KB**    | 1\*          |
| @vielzeug/formit  | **7.2 KB**                 | **2.4 KB**    | 0            |
| @vielzeug/i18nit  | **7.4 KB**                 | **2.4 KB**    | 0            |
| @vielzeug/logit   | **6.8 KB**                 | **2.4 KB**    | 0            |
| @vielzeug/permit  | **5.9 KB**                 | **2.0 KB**    | 1\*          |
| @vielzeug/toolkit | **0.1-1.0 KB** per utility | **0.1-0.5 KB**| 0-1\*        |
| @vielzeug/validit | **14 KB**                  | **2.8 KB**    | 0            |
| @vielzeug/wireit  | **8.0 KB**                 | **2.1 KB**    | 0            |

\* Only depends on other @vielzeug packages (deposit depends on @vielzeug/logit and @vielzeug/toolkit; fetchit depends on @vielzeug/toolkit; permit depends on @vielzeug/logit; toolkit utilities may depend on other toolkit utilities)

## 🌐 Browser & Node.js Support

- **Browsers**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Node.js**: v18.0.0 or higher
- **TypeScript**: v5.0.0 or higher

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: [Open an issue](https://github.com/helmuthdu/vielzeug/issues)
2. **Suggest Features**: [Start a discussion](https://github.com/helmuthdu/vielzeug/discussions)
3. **Submit PRs**: Fork, create a branch, and submit a pull request

### Contribution Guidelines

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:

- All tests pass (`pnpm test`)
- Code follows the style guide (`pnpm lint`)
- Documentation is updated if needed

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

Each package is individually licensed under the MIT License. See the LICENSE file in each package directory for details.

## 🔗 Links

- [Documentation](https://helmuthdu.github.io/vielzeug/)
- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [Discussions](https://github.com/helmuthdu/vielzeug/discussions)
- [NPM Organization](https://www.npmjs.com/org/vielzeug)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/CHANGELOG.md)

## ⭐ Show Your Support

If you find Vielzeug useful, please consider:

- Giving the project a ⭐ on [GitHub](https://github.com/helmuthdu/vielzeug)
- Sharing it with your colleagues and friends
- Contributing to the project
- Reporting bugs or suggesting features

## 📝 Frequently Asked Questions

### Why Vielzeug instead of [other library]?

Vielzeug focuses on:

- **Type Safety**: First-class TypeScript support, not an afterthought
- **Zero Dependencies**: Maximum security and minimal bundle size
- **Framework Agnostic**: Works everywhere JavaScript runs
- **Modern APIs**: Built for modern development workflows

### Can I use individual packages?

Absolutely! Each package is independent and can be used standalone. Install only what you need.

### Is it production-ready?

Yes! All packages are battle-tested in production applications with comprehensive test coverage.

### Where can I get help?

- 📖 [Documentation](https://helmuthdu.github.io/vielzeug/)
- 💬 [GitHub Discussions](https://github.com/helmuthdu/vielzeug/discussions)
- 🐛 [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)

---

<div align="center">

**Made with ❤️ by [Helmuth Saatkamp](https://github.com/helmuthdu)**

[⬆ Back to Top](#vielzeug)

</div>
