# Changesets

This directory contains changeset files that describe changes to packages in this monorepo.

## Creating a Changeset

When you make changes that should be published, create a changeset:

```bash
pnpm changeset
```

This will:
1. Ask which packages have changed
2. Ask what kind of change (major, minor, patch)
3. Ask for a summary of the changes
4. Create a changeset file in `.changeset/`

## Versioning and Publishing

When you're ready to release:

1. **Version packages**: Run `pnpm version` to update package versions and generate changelogs
2. **Publish**: Run `pnpm release` to build, test, and publish to npm

The GitHub Actions workflow will automatically:
- Create a PR with version bumps when changesets are merged
- Publish to npm when the version PR is merged

## Changeset Files

Changeset files are temporary and will be automatically deleted after versioning. They follow this format:

```
---
"package-name": patch
---

Description of the change
```






