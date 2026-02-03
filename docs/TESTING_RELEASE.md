# Testing the Release Workflow

This guide explains how to safely test the release workflow before using it for real releases.

## Test Workflow Overview

The `release-test.yml` workflow is a **dry run version** of the release workflow that:

✅ **Does everything except the risky parts:**

- ✅ Installs dependencies
- ✅ Builds packages
- ✅ Bumps version numbers
- ✅ Generates changelogs
- ✅ Creates tarballs
- ✅ Creates a draft GitHub Release

❌ **Skips the permanent actions:**

- ❌ Does NOT commit to repository
- ❌ Does NOT push commits or tags
- ❌ Does NOT publish to npm
- ❌ Creates only a DRAFT release (easy to delete)

## How to Run the Test

### Step 1: Commit the Test Workflow

```bash
git add .github/workflows/release-test.yml
git commit -m "feat: add test release workflow"
git push
```

### Step 2: Trigger the Test

1. Go to your GitHub repository
2. Click **Actions** tab
3. In the left sidebar, click **"Test Release Package (Dry Run)"**
4. Click **"Run workflow"** button (top right)
5. Select:
   - **Package**: Choose any package (e.g., `@vielzeug/toolkit`)
   - **Bump**: Choose `patch` for testing
6. Click **"Run workflow"**

### Step 3: Watch the Workflow Run

The workflow will execute all the steps. You can:

- Click on the running workflow to see live logs
- Check each step's output
- Look for green checkmarks ✅

### Step 4: Review the Test Results

After the workflow completes:

#### A. Check the Draft Release

1. Go to **Releases** page in your repository
2. Find the draft release: **[TEST] @vielzeug/package vX.X.X**
3. Review:
   - Release notes format
   - Links in the description
   - The attached `.tgz` file

#### B. Download and Inspect the Tarball

```bash
# Download the .tgz file from the draft release
tar -tzf vielzeug-package-X.X.X.tgz

# Extract and inspect
tar -xzf vielzeug-package-X.X.X.tgz
cd package
ls -la
cat package.json
```

#### C. Check the Workflow Logs

In the Actions tab, review the logs for:

- **"Show what would be committed"** - See version bump and changelog changes
- **"Dry run - npm publish check"** - Verify package metadata
- **"Test Summary"** - Overall results

## What to Look For

### ✅ Good Signs

- [x] Workflow completes with all green checkmarks
- [x] Version number bumped correctly (e.g., 1.0.0 → 1.0.1)
- [x] CHANGELOG.md entry created with proper format
- [x] Tarball contains all expected files
- [x] Draft release created with correct information
- [x] Package folder detected correctly

### ⚠️ Warning Signs

- [ ] Workflow fails at any step
- [ ] Package folder not found
- [ ] Build errors
- [ ] Tarball missing files
- [ ] Version didn't bump correctly

## Troubleshooting Test Issues

### "Package folder not found"

**Problem**: The workflow can't find the package in rush.json

**Solution**: Check that the package name matches exactly:

```bash
grep -A2 "packageName" rush.json
```

### "Build failed"

**Problem**: Package or dependencies don't build

**Solution**:

```bash
# Test locally first
node common/scripts/install-run-rush.js install
node common/scripts/install-run-rush.js build --to @vielzeug/package --verbose
```

### "npm pack failed"

**Problem**: Package.json or build output issues

**Solution**: Check that:

- `package.json` has correct `files` field
- `dist/` folder is created by build
- No syntax errors in package.json

## After Successful Test

### Step 1: Clean Up Test Release

1. Go to **Releases** page
2. Find the draft test release
3. Click **Delete** (since it's a draft, this is safe)

### Step 2: Delete Test Tag (Optional)

```bash
# If you want to clean up the test tag
git tag -d test-@vielzeug/package@X.X.X
git push origin :refs/tags/test-@vielzeug/package@X.X.X
```

Or via GitHub UI:

1. Go to **Tags** page
2. Find `test-@vielzeug/package@X.X.X`
3. Delete it

### Step 3: Run the Real Release

Now that you've verified everything works:

1. Go to **Actions** tab
2. Click **"Release Package"** (the real one, not test)
3. Click **"Run workflow"**
4. Select package and bump type
5. Click **"Run workflow"**

This time it will:

- ✅ Commit the changes
- ✅ Push tags
- ✅ Publish to npm
- ✅ Create a real (non-draft) release

## Testing Multiple Scenarios

You can run the test workflow multiple times to test:

### Test 1: Patch Release

- Package: `@vielzeug/toolkit`
- Bump: `patch`
- Expected: 1.0.0 → 1.0.1

### Test 2: Minor Release

- Package: `@vielzeug/fetchit`
- Bump: `minor`
- Expected: 1.0.0 → 1.1.0

### Test 3: Major Release

- Package: `@vielzeug/logit`
- Bump: `major`
- Expected: 1.0.0 → 2.0.0

After each test, delete the draft release before running the next one.

## Comparing Test vs Real Workflow

| Action               | Test Workflow    | Real Workflow     |
| -------------------- | ---------------- | ----------------- |
| Install dependencies | ✅ Yes           | ✅ Yes            |
| Build package        | ✅ Yes           | ✅ Yes            |
| Bump version         | ✅ Yes           | ✅ Yes            |
| Update CHANGELOG     | ✅ Yes           | ✅ Yes            |
| Create tarball       | ✅ Yes           | ✅ Yes            |
| Git commit           | ❌ No            | ✅ Yes            |
| Git push             | ❌ No            | ✅ Yes            |
| Create tag           | ⚠️ Test tag only | ✅ Real tag       |
| Publish to npm       | ❌ No            | ✅ Yes            |
| GitHub Release       | ⚠️ Draft only    | ✅ Public release |

## Benefits of Testing First

1. **Safety**: No permanent changes to repository or npm
2. **Validation**: Verify the workflow works with your setup
3. **Preview**: See exactly what will be released
4. **Learning**: Understand the workflow without risk
5. **Debugging**: Fix issues before they affect production

## When You're Ready

Once the test workflow passes successfully:

1. ✅ Delete test releases and tags
2. ✅ Ensure `NPM_TOKEN` secret is configured
3. ✅ Run the real `Release Package` workflow
4. ✅ Verify package appears on npm
5. ✅ Check the GitHub release is created

## Quick Test Checklist

- [ ] Committed and pushed `release-test.yml`
- [ ] Ran test workflow successfully
- [ ] Reviewed draft release
- [ ] Downloaded and inspected tarball
- [ ] Checked changelog format
- [ ] Verified version bump is correct
- [ ] Cleaned up test release
- [ ] Ready to run real release workflow

---

**Note**: The test workflow is safe to run multiple times. It never makes permanent changes to your repository or npm registry.
