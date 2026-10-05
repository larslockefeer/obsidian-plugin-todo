import { Before, Given, Then, When } from '@wdio/cucumber-framework';
import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

const viewType = 'online.larslockefeer.obsidian-plugin-todo';
const pluginId = 'obsidian-plugin-todo';
const listIndexes = {
  Today: 0,
  Scheduled: 1,
  Inbox: 2,
  'Someday/Maybe': 3,
};

Before(async () => {
  await obsidianPage.resetVault();
  await browser.executeObsidian(
    async ({ app }, id, type) => {
      app.workspace.getLeavesOfType('markdown').forEach((leaf) => leaf.detach());
      const plugin = app.plugins.plugins[id];
      await plugin.updateSettings({
        dateFormat: 'yyyy-MM-dd',
        dateTagFormat: '#%date%',
        openFilesInNewLeaf: true,
      });
      app.workspace.getLeavesOfType(type).forEach((leaf) => app.workspace.revealLeaf(leaf));
    },
    pluginId,
    viewType,
  );
});

Given('the TODO view is open', async () => {
  await browser.executeObsidian(({ app }, type) => {
    const leaf = app.workspace.getLeavesOfType(type)[0];
    if (leaf) app.workspace.revealLeaf(leaf);
  }, viewType);
  await browser.waitUntil(async () => (await browser.$$('.todo-item-view-toolbar-item')).length === 4);
});

Given('my vault has a task called {string} due today', async (description) => {
  await browser.executeObsidian(async ({ app }, taskDescription) => {
    const date = new Date();
    const today = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    await app.vault.create('Due Today.md', `- [ ] ${taskDescription} #${today}`);
  }, description);
});

Given('the date display format is {string}', async (dateFormat) => {
  await updatePluginSettings({ dateFormat });
});

Given('the date tag format is {string}', async (dateTagFormat) => {
  await updatePluginSettings({ dateTagFormat });
});

Given('opening files in a new leaf is disabled', async () => {
  await updatePluginSettings({ openFilesInNewLeaf: false });
});

Given('another note is open', async () => {
  await browser.executeObsidian(async ({ app }) => {
    const file = app.vault.getAbstractFileByPath('Home.md');
    if (file) await app.workspace.getLeaf(true).openFile(file);
  });
});

When('I open the {string} list', async (listName) => {
  const index = listIndexes[listName];
  if (index === undefined) throw new Error(`Unknown TODO list: ${listName}`);
  await (await browser.$$('.todo-item-view-toolbar-item'))[index].click();
});

When('I mark {string} as complete', async (description) => {
  const row = await waitForTask(description);
  await row.$('input[type="checkbox"]').click();
});

When('I open the source note for {string}', async (description) => {
  const row = await waitForTask(description);
  await row.$('.todo-item-view-item-link').click();
});

Then('I should see {string}', async (description) => {
  const row = await waitForTask(description);
  await expect(row).toHaveText(expect.stringContaining(description));
});

Then('I should not see {string}', async (description) => {
  await browser.waitUntil(async () => !(await findTask(description)), {
    timeout: 10000,
    timeoutMsg: `Expected "${description}" not to appear in the selected TODO list`,
  });
});

Then("the due date for {string} should be today's date", async (description) => {
  const row = await waitForTask(description);
  const date = await row.$('.due-date').getText();
  const today = await browser.execute(() => {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  });
  await expect(date).toBe(today);
});

Then('the due date for {string} should be {string}', async (description, expectedDate) => {
  const row = await waitForTask(description);
  await expect(row.$('.due-date')).toHaveText(expectedDate);
});

Then('the tasks should appear in this order:', async (table) => {
  const expected = table.raw().map(([description]) => description);
  await browser.waitUntil(async () => {
    const actual = await taskTexts();
    return expected.every((description) => actual.some((text) => text.includes(description)));
  });
  const actual = await taskTexts();
  const actualOrder = expected.map((description) => actual.findIndex((text) => text.includes(description)));
  await expect(actualOrder).toEqual([...actualOrder].sort((a, b) => a - b));
});

Then('{string} should contain the completed task {string}', async (filePath, description) => {
  await browser.waitUntil(async () => {
    const contents = await browser.executeObsidian(async ({ app }, path) => {
      const file = app.vault.getAbstractFileByPath(path);
      return file ? app.vault.read(file) : '';
    }, filePath);
    return contents.includes(`- [x] ${description}`);
  });
});

Then('the active note should be {string}', async (filePath) => {
  const activeFile = await browser.executeObsidian(({ app }) => app.workspace.getActiveFile()?.path);
  await expect(activeFile).toBe(filePath);
});

Then('both {string} and {string} should remain open', async (firstPath, secondPath) => {
  const openMarkdownFiles = await browser.executeObsidian(({ app }) =>
    app.workspace
      .getLeavesOfType('markdown')
      .map((leaf) => leaf.view.file?.path)
      .filter(Boolean),
  );
  await expect(openMarkdownFiles).toContain(firstPath);
  await expect(openMarkdownFiles).toContain(secondPath);
});

Then('{string} should not remain open', async (filePath) => {
  const openMarkdownFiles = await browser.executeObsidian(({ app }) =>
    app.workspace
      .getLeavesOfType('markdown')
      .map((leaf) => leaf.view.file?.path)
      .filter(Boolean),
  );
  await expect(openMarkdownFiles).not.toContain(filePath);
});

async function findTask(description) {
  const rows = await browser.$$('.todo-item-view-item');
  for (const row of rows) {
    if ((await row.getText()).includes(description)) return row;
  }
  return undefined;
}

async function taskTexts() {
  const rows = await browser.$$('.todo-item-view-item');
  const texts = [];
  for (const row of rows) texts.push(await row.getText());
  return texts;
}

async function updatePluginSettings(changes) {
  await browser.executeObsidian(
    async ({ app }, id, updatedSettings) => {
      const plugin = app.plugins.plugins[id];
      await plugin.updateSettings({ ...plugin.getSettings(), ...updatedSettings });
    },
    pluginId,
    changes,
  );
}

async function waitForTask(description) {
  await browser.waitUntil(async () => Boolean(await findTask(description)), {
    timeout: 10000,
    timeoutMsg: `Expected "${description}" to appear in the selected TODO list`,
  });
  return findTask(description);
}
