# Contribution guidelines

## Test a specific commit with BRAT

Maintainers can publish a mobile-installable test build without changing the stable release:

1. Push the commit to this repository and copy its full SHA (`git rev-parse HEAD`).
2. In GitHub Actions, run **Publish BRAT beta** with that SHA as `commit_sha`.
3. The workflow runs unit tests, lint, and builds that exact commit, then publishes a prerelease with
   `main.js`, `manifest.json`, and `styles.css`. Its tag and packaged manifest version
   are `<next-patch>-beta.sha-<full-SHA>` (for example, `0.3.3-beta.sha-…` for source version `0.3.2`).
   The full version appears in the workflow summary.
4. In BRAT on mobile or desktop, add `larslockefeer/obsidian-plugin-todo` and select
   that specific version rather than **latest**. Back up your vault before testing.
   BRAT's own **latest** selection can include prereleases; these SHA-based tags
   are not chronological, so always pin the version you intend to test.

The workflow must first exist on the default branch for GitHub to allow manual
dispatch. Once available, it can build pushed commits from PR branches, not just
`main`. From the CLI, run:

```sh
gh workflow run beta-release.yml -f commit_sha="$(git rev-parse HEAD)"
```

Beta releases are published (not drafts), are not marked as GitHub's latest release,
and do not modify source manifests or bump the stable version. Existing releases
are never overwritten; choose a new commit to publish a different build. The normal
release workflow is unchanged, and desktop end-to-end tests remain in CI. To return
to stable, remove the BRAT subscription and reinstall Vault Todos from Obsidian's
community plugins.

