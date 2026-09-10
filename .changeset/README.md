# Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) for managing versions and publishing releases.

## Adding a Changeset

When making a change that should be included in the release notes and trigger a version bump:

```bash
bun run changeset
```

Follow the interactive prompts to select the package(s) and bump type (`major`, `minor`, `patch`), then write a summary of the change.

## Publishing Releases

1. Bump versions and update CHANGELOGs:
   ```bash
   bun run version-packages
   ```
2. Build and publish all packages to npm:
   ```bash
   bun run release
   ```
