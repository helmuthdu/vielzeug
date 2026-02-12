<!--
  Thanks for contributing to Vielzeug! 🎉
  
  Please write in English and follow the template below.
  All sections marked with (*) are required.
  
  💡 Tip: Consider opening an issue first to discuss your change idea.
-->

## Summary *

<!-- 
  Provide a clear and concise description of what this PR does.
  What problem does it solve? What feature does it add?
-->

## Type of Change

<!-- Check all that apply -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🎨 Code style/formatting (no functional changes)
- [ ] ♻️ Refactoring (no functional changes, no API changes)
- [ ] ⚡ Performance improvement
- [ ] ✅ Test update
- [ ] 🔧 Build/CI configuration change
- [ ] 🧹 Chore (dependency updates, etc.)

## Related Issue

<!-- 
  Link to the issue this PR addresses (if applicable).
  Use "Closes #123" to automatically close the issue when PR is merged.
  Use "Relates to #123" for related but not fully resolved issues.
-->

- Closes #
- Relates to #

## Motivation and Context

<!-- 
  Why is this change required? What problem does it solve?
  What are the use cases?
-->

## Changes Made

<!-- 
  List the main changes in this PR.
  Be specific - what files/components were modified?
-->

-
-
-

## Screenshots / Examples (if applicable)

<!-- 
  Add screenshots, code examples, or demos if relevant.
  Before/after comparisons are especially helpful.
-->

## Checklist *

### General

- [ ] I have read the [Contributing Guidelines](../CONTRIBUTING.md)
- [ ] My code follows the project's code style and conventions
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings or errors
- [ ] I have tested my changes locally

### Documentation

- [ ] Documentation has been updated to reflect changes (if needed)
- [ ] README files have been updated (if needed)
- [ ] JSDoc/TSDoc comments have been added/updated (if needed)
- [ ] Examples have been updated (if needed)

### Testing

- [ ] New tests have been added for new functionality
- [ ] Existing tests have been updated (if needed)
- [ ] All tests pass locally (`rush test` or `pnpm test`)
- [ ] Test coverage has not decreased

### Release

- [ ] Change file created using Rush (`rush change`)
- [ ] Package version will be bumped appropriately (patch/minor/major)

## Breaking Changes *

<!-- If this PR introduces breaking changes, describe them here -->

- [ ] **Yes, this PR introduces breaking changes**
- [ ] **No breaking changes**

<!-- 
  If YES, please describe:
  - What breaks?
  - What is the impact on existing users?
  - What is the migration path?
  - Which packages are affected?
-->

**Migration Guide** (if breaking):

```typescript
// Before


// After

```

## Affected Packages

<!-- Check all packages that are affected by this PR -->

- [ ] @vielzeug/deposit
- [ ] @vielzeug/fetchit
- [ ] @vielzeug/formit
- [ ] @vielzeug/i18nit
- [ ] @vielzeug/logit
- [ ] @vielzeug/permit
- [ ] @vielzeug/toolkit
- [ ] @vielzeug/validit
- [ ] @vielzeug/wireit
- [ ] Documentation
- [ ] Build/CI
- [ ] Other: _____

## Additional Notes

<!-- Any additional information that reviewers should know -->

## Reviewer Checklist (for maintainers)

- [ ] Code quality meets project standards
- [ ] Tests are comprehensive and passing
- [ ] Documentation is clear and complete
- [ ] Breaking changes are properly documented
- [ ] PR title follows the conventional commits format
- [ ] Commits are clean and well-organized
