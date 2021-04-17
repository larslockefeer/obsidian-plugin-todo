import { App, PluginSettingTab, Setting } from 'obsidian';
import type TodoPlugin from "./main";

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
  }
}
