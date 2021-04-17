import { App, PluginSettingTab, Setting } from 'obsidian';
import TodoPlugin from "./main";

export const DEFAULT_SETTINGS: TodoPluginSettings = {
  onlyRootTasks: false,
};

export interface TodoPluginSettings {
  onlyRootTasks: boolean;
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
    let {containerEl} = this;

    containerEl.empty();

    containerEl.createEl('h2', {text: 'Obsidian TODO | Text-based GTD'});
    containerEl.createEl('p', {
      text: 'Collects all outstanding TODOs from your vault and presents them in lists Today, Scheduled, Inbox and Someday/Maybe.',
    });
    containerEl.createEl('h3', {text: 'General Settings'});

    new Setting(containerEl)
      .setName('Only show root tasks')
      .setDesc('If enabled, subtasks (i.e. indented) will not be shown. If disabled, they will.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.onlyRootTasks);
        toggle.onChange(async (value) => {
          this.plugin.settings.onlyRootTasks = value;
          await this.plugin.saveSettings();
        });
      });
  }
}
