# Obsidian GTD plugin
## Roadmap
- [ ] Integrate with Daily Notes plugin, assume tasks in a daily note without a due date are scheduled for that day
- [ ] Add setting to prevent files at specific paths from being indexed
- [ ] Allow filtering in the list views via a freeform query
- [ ] Group tasks in the list views by file

## Version 0.2.2
- [x] Add Demo Vault, showing off all features

## Version 0.2.1
- [x] Render due dates in list view

## Version 0.2.0
- [x] Fix timezone issues
- [x] Add settings tab
- [x] Add setting to change the date format
- [x] Add setting to change the format of the date tag
- [x] Add setting to open files in new leaf

## Pre-release M2 | Support full GTD flow
- [x] Add "Inbox"-view
- [x] Define syntax for scheduling
- [x] Add "Today"-view / "Scheduled"-view
- [x] Add "Someday/Maybe"-view

## Pre-release M1 | List all TODOs in a single list
- [x] Get item view to render as side panel
- [x] Write parser to parse all TODOs from all files
- [x] Create index with all results from above
- [x] Subscribe index to file edit/delete events, reindex file
- [x] List all outstanding todos in item view
- [x] Create simple UI
- [x] Allow for completion of TODOs, remove them from list
- [x] It seems events are not always firing, causing delays in the view on the right.
- [x] Add linting pre-commit hook
	- See https://www.robertcooper.me/using-eslint-and-prettier-in-a-typescript-project
- [x] Add link to file in which TODO is found
- [x] Render links correctly in list view
- [x] Write README