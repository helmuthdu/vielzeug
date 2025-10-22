# Contributing to Vielzeug

Thank you for investing your time in contributing to Vielzeug!

## You have a question?

If you have a general question about Vielzeug, you can ask it on the [discussions](https://github.com/helmuthdu/vielzeug/discussions) page. Please search first to see if your question has already been answered. If not, feel free to start a new discussion.

## You have a problem?

If you have a bug or want an improvement in Vielzeug, check the [issues](https://github.com/helmuthdu/vielzeug/issues) page. If it’s not already listed, create a new issue.

## You want to contribute?

Look through the [issues](https://github.com/helmuthdu/vielzeug/issues) and pick one you want to work on. Issues aren’t assigned, so just open a PR if you fix one. You can ask questions in the issue comments before you start.

## You want to write code?

- Install dependencies with `pnpm i` in the root directory.
- Add a new function using `pnpm add-function <group-name>/<function-name>`, then export it from `src/mod.ts`.
- Run tests with `pnpm test` (requires Node v16+, use `nvm use` if needed). Ensure all tests pass and coverage is 100%.
- Lint your code with `pnpm lint`.
- Review docs and source code to understand existing functions.

## You're ready to push a change?

After updating your fork, open a pull request to the `main` branch of the [vielzeug](https://github.com/helmuthdu/vielzeug) repository.

- Add a clear description of your changes.
- [Link the PR to an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) if relevant.
- [Allow maintainer edits](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork) for easier merging.

After you submit your PR, a maintainer will review it and may ask for more details.

## Your PR gets labeled with `prerelease`

If a maintainer adds the `prerelease` label to your PR, it will be published as a `beta` or `next` version on NPM. The Vielzeug Bot will notify you. Bug fix PRs are not published as prereleases.

## Your PR gets merged!

Congrats :tada: Major and minor releases are published manually. Bug fixes are published to NPM right away as patches. For new features, you can use a `beta` or `next` version until the official release.
