# Obsidian end-to-end tests

These Gherkin scenarios describe user-visible workflows in plain language and
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

Add Markdown fixtures under `e2e/vaults/`, describe behavior in a `.feature`
file under `e2e/features/`, and implement reusable steps in
`e2e/step-definitions/`. Prefer user-visible behavior in scenarios; keep
vault-specific setup in fixture notes instead of relying on a developer's
personal Obsidian vault.

Current scenarios cover category assignment (including overdue, today, future,
and someday tasks), daily-note dates, ordering, completion, opening source
notes, and the documented date-format and new-leaf preferences. Preference
values are set through the plugin API in scenario setup; the rendered task lists
and note changes are still asserted through the running Obsidian app.
