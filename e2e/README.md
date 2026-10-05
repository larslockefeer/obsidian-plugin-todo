# Obsidian end-to-end tests

These Mocha scenarios describe user-visible workflows in plain language and
exercise the actual Obsidian desktop UI. Each run opens a disposable test vault,
installs this plugin, and launches Obsidian under a virtual display.

Run locally with Node 22:

```sh
yarn install
yarn build
yarn test:e2e
```

The local machine needs the Linux desktop libraries used by Obsidian, Xvfb, and
herbstluftwm. GitHub Actions installs the window-system tools in the CI job.

Add a Markdown fixture under `e2e/vaults/` and a corresponding
`*.e2e.mjs` scenario. Describe the expected user outcome in the scenario name;
keep setup data in the fixture vault rather than relying on the developer's
personal Obsidian vault.
