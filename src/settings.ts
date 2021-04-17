import { App, PluginSettingTab, Setting } from 'obsidian';
import type TodoPlugin from './main';

export const DEFAULT_SETTINGS: TodoPluginSettings = {
  onlyRootTasks: false,
  ignoredNotes: {},
};

export interface TodoPluginSettings {
  onlyRootTasks: boolean;
  ignoredNotes: { [key: string]: null };
}

export class TodoPluginSettingTab extends PluginSettingTab {
  plugin: TodoPlugin;
  app: App;

  constructor(app: App, plugin: TodoPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.app = app;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Obsidian TODO | Text-based GTD' });
    containerEl.createEl('p', {
      text:
        'Collects all outstanding TODOs from your vault and presents them in lists Today, Scheduled, Inbox and Someday/Maybe.',
    });
    containerEl.createEl('h3', { text: 'General Settings' });
    containerEl.createEl('p', {
      text: '...',
    });
    containerEl.createEl('h3', { text: 'Ignored Notes' });
    containerEl.createEl('p', {
      text: 'You can ignore notes from this plugin by using the “Ignore this note” command',
    });

    for (let key in this.plugin.settings.ignoredNotes) {
      const ignoredFilesSettingsObj = new Setting(containerEl).setDesc(key);

      ignoredFilesSettingsObj.addButton((button) => {
        button.setButtonText('Delete').onClick(async () => {
          delete this.plugin.settings.ignoredNotes[key];
          await this.plugin.saveSettings();
          this.display();
        });
      });
    }
  }
}
