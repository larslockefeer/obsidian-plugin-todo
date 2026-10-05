import { browser, expect } from '@wdio/globals';

describe('TODO list user workflow', function () {
  it('a user can find an undated task in Inbox and complete it', async function () {
    // Reveal the plugin's default right-sidebar view in the automated viewport.
    await browser.executeObsidian(({ app }) => {
      const leaf = app.workspace.getLeavesOfType('online.larslockefeer.obsidian-plugin-todo')[0];
      if (leaf) app.workspace.revealLeaf(leaf);
    });
    // Obsidian opens the plugin view in the Today pane. Switch to Inbox, where
    // undated tasks are shown.
    await browser.waitUntil(async () => (await browser.$$('.todo-item-view-toolbar-item')).length === 4);
    const inboxTab = (await browser.$$('.todo-item-view-toolbar-item'))[2];
    await inboxTab.click();

    const task = browser.$('.todo-item-view-item');
    await task.waitForExist();
    await expect(task).toHaveText(expect.stringContaining('Buy milk'));

    // Completing the task through the UI should also update its Markdown file.
    await task.$('input[type="checkbox"]').click();
    await browser.waitUntil(async () => {
      const markdown = await browser.executeObsidian(async ({ app }) => {
        const file = app.vault.getAbstractFileByPath('Tasks.md');
        return file ? app.vault.read(file) : '';
      });
      return markdown.includes('- [x] Buy milk');
    });
  });
});
